package com.suangua.xiaoliuren;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {

    private static final String APP_URL = "https://rongyaozhixing.github.io/suangua/";
    private static final String LOCAL_URL = "file:///android_asset/web/index.html";
    // 更新源：OSS（国内直连，不翻墙）优先，GitHub 兜底
    private static final String[] VERSION_URLS = {
            "https://xiaoliuren-app.oss-cn-beijing.aliyuncs.com/version.json",
            "https://rongyaozhixing.github.io/suangua/version.json"
    };
    private static final String UPDATE_APK_NAME = "xiaoliuren-update.apk";
    private static final String PREFS = "xln_prefs";
    private static final String KEY_REMOTE_OK = "remote_ok";

    private WebView webView;
    private LinearLayout errorView;
    private TextView errorText;
    private ProgressBar progressBar;
    private long pendingDownloadId = -1;
    private String pendingApkUrl = "";
    private String latestVersionName = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        webView = new WebView(this);
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);

        errorView = new LinearLayout(this);
        errorView.setOrientation(LinearLayout.VERTICAL);
        errorView.setGravity(android.view.Gravity.CENTER);
        errorView.setPadding(40, 200, 40, 40);
        errorView.setVisibility(View.GONE);

        errorText = new TextView(this);
        errorText.setTextSize(16);
        errorText.setGravity(android.view.Gravity.CENTER);
        errorText.setPadding(0, 0, 0, 30);
        errorView.addView(errorText);

        Button retry = new Button(this);
        retry.setText("重 试");
        errorView.addView(retry);

        root.addView(progressBar, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 12));
        root.addView(errorView, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        root.addView(webView, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);

        retry.setOnClickListener(v -> {
            errorView.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
            loadUrl();
        });

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                progressBar.setProgress(5);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setProgress(100);
                progressBar.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                String url = request != null && request.getUrl() != null ? request.getUrl().toString() : "";
                if (url.startsWith(APP_URL)) {
                    // 远程加载失败 → 回退内置离线版
                    getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(KEY_REMOTE_OK, false).apply();
                    progressBar.setVisibility(View.GONE);
                    webView.loadUrl(LOCAL_URL);
                } else if (url.startsWith("file:///android_asset") && !webView.getUrl().startsWith("file:///android_asset")) {
                    // 本地内置也失败（不应发生）→ 显示错误
                    progressBar.setVisibility(View.GONE);
                    webView.setVisibility(View.GONE);
                    errorView.setVisibility(View.VISIBLE);
                    errorText.setText(isOnline() ? "加载失败，请重试" : "当前无网络连接\n请检查网络后重试");
                }
            }
        });

        loadUrl();

        // 启动时检查软件更新（后台线程，不阻塞页面加载）
        // Android 14+ 动态注册必须带 flag，否则抛 SecurityException 闪退
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            registerReceiver(downloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(downloadReceiver, filter);
        }
        checkUpdate();
    }

    /**
     * 加载策略：内置离线版兜底 + 远程优先
     * 上次远程可用 → 先试远程（失败自动回退本地）；否则先本地，后台探测远程可达再切换
     */
    private void loadUrl() {
        boolean remoteOk = getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_REMOTE_OK, false);
        if (remoteOk) {
            progressBar.setProgress(5);
            progressBar.setVisibility(View.VISIBLE);
            webView.loadUrl(APP_URL);
        } else {
            webView.loadUrl(LOCAL_URL);
            probeRemote();
        }
    }

    /** 后台探测远程是否可达，可达则切到最新版 */
    private void probeRemote() {
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(APP_URL).openConnection();
                c.setConnectTimeout(6000);
                c.setReadTimeout(6000);
                c.setRequestMethod("GET");
                int code = c.getResponseCode();
                c.disconnect();
                if (code == 200) {
                    getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(KEY_REMOTE_OK, true).apply();
                    runOnUiThread(() -> {
                        progressBar.setProgress(5);
                        progressBar.setVisibility(View.VISIBLE);
                        webView.loadUrl(APP_URL);
                    });
                }
            } catch (Exception ignored) {
                // 远程不可达：保持本地内置版
            }
        }).start();
    }

    /** 联网检查版本（OSS 优先，GitHub 兜底），发现新版 → 弹窗提示 */
    private void checkUpdate() {
        new Thread(() -> {
            for (String urlStr : VERSION_URLS) {
                try {
                    HttpURLConnection c = (HttpURLConnection) new URL(urlStr).openConnection();
                    c.setConnectTimeout(6000);
                    c.setReadTimeout(6000);
                    c.setRequestProperty("Accept", "application/json");
                    int code = c.getResponseCode();
                    if (code != 200) {
                        c.disconnect();
                        continue;
                    }
                    InputStream is = c.getInputStream();
                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    byte[] buf = new byte[4096];
                    int n;
                    while ((n = is.read(buf)) != -1) bos.write(buf, 0, n);
                    c.disconnect();
                    JSONObject o = new JSONObject(new String(bos.toByteArray(), "UTF-8"));
                    int remoteCode = o.getInt("versionCode");
                    String versionName = o.getString("versionName");
                    String apkUrl = o.getString("apkUrl");
                    String note = o.optString("note", "");
                    int localCode = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
                    if (remoteCode > localCode) {
                        latestVersionName = versionName;
                        String lanzouUrl = o.optString("lanzouUrl", "");
                        String lanzouPwd = o.optString("lanzouPwd", "");
                        runOnUiThread(() -> showUpdateDialog(versionName, note, apkUrl, lanzouUrl, lanzouPwd));
                    }
                    break; // 任一源成功即结束
                } catch (Exception ignored) {
                }
            }
        }).start();
    }

    private void showUpdateDialog(String ver, String note, String url, String lanzouUrl, String lanzouPwd) {
        if (isFinishing()) return;
        String pwdHint = (lanzouPwd != null && !lanzouPwd.isEmpty())
                ? "\n\n（蓝奏云提取码：" + lanzouPwd + "）" : "";
        AlertDialog.Builder b = new AlertDialog.Builder(this)
                .setTitle("发现新版本 v" + ver)
                .setMessage(note + "\n\n选择下载方式安装更新。" + pwdHint)
                .setPositiveButton("直接下载", (d, w) -> downloadApk(url))
                .setNegativeButton("暂不", null);
        if (lanzouUrl != null && !lanzouUrl.isEmpty()) {
            // 国内直连下载（蓝奏云），不翻墙可用
            b.setNeutralButton("国内下载（蓝奏云）", (d, w) -> {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(lanzouUrl)));
                } catch (Exception ignored) {
                }
            });
        }
        b.show();
    }

    private void downloadApk(String url) {
        try {
            pendingApkUrl = url;
            DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
            req.setTitle("小六壬占 更新");
            req.setDescription("正在下载新版本…");
            req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, UPDATE_APK_NAME);
            pendingDownloadId = dm.enqueue(req);
            Toast.makeText(this, "开始下载更新（通知栏查看进度）", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "下载失败：" + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    /** 下载完成 → 触发安装 */
    private final BroadcastReceiver downloadReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context c, Intent intent) {
            long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
            if (id != pendingDownloadId) return;
            int status = -1;
            try {
                DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                Cursor cur = dm.query(new DownloadManager.Query().setFilterById(id));
                if (cur != null && cur.moveToFirst()) {
                    status = cur.getInt(cur.getColumnIndex(DownloadManager.COLUMN_STATUS));
                    cur.close();
                }
            } catch (Exception ignored) {
            }
            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                installApk();
            } else if (status == DownloadManager.STATUS_FAILED && pendingApkUrl.contains("oss-cn")
                    && !latestVersionName.isEmpty()) {
                // OSS 域名禁分发 APK（阿里云政策）→ 自动切 GitHub 备用源重试
                String githubUrl = "https://github.com/rongyaozhixing/suangua/releases/download/v"
                        + latestVersionName + "/app-release.apk";
                Toast.makeText(MainActivity.this, "国内源受限，改用备用源下载…", Toast.LENGTH_LONG).show();
                downloadApk(githubUrl);
            }
        }
    };

    private void installApk() {
        try {
            File f = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), UPDATE_APK_NAME);
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", f);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            Toast.makeText(this, "安装失败：" + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private boolean isOnline() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        NetworkInfo ni = cm.getActiveNetworkInfo();
        return ni != null && ni.isConnected();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        try {
            unregisterReceiver(downloadReceiver);
        } catch (Exception ignored) {
        }
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
