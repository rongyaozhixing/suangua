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
    private static final String VERSION_URL = "https://rongyaozhixing.github.io/suangua/version.json";
    private static final String UPDATE_APK_NAME = "xiaoliuren-update.apk";

    private WebView webView;
    private LinearLayout errorView;
    private TextView errorText;
    private ProgressBar progressBar;
    private long pendingDownloadId = -1;

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
                if (request != null && request.getUrl() != null
                        && request.getUrl().toString().equals(APP_URL)) {
                    progressBar.setVisibility(View.GONE);
                    webView.setVisibility(View.GONE);
                    errorView.setVisibility(View.VISIBLE);
                    errorText.setText(isOnline() ? "加载失败，请重试" : "当前无网络连接\n请检查网络后重试");
                }
            }
        });

        loadUrl();

        // 启动时检查软件更新（后台线程，不阻塞页面加载）
        registerReceiver(downloadReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
        checkUpdate();
    }

    /** 联网检查版本，发现新版 → 弹窗提示 */
    private void checkUpdate() {
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(VERSION_URL).openConnection();
                c.setConnectTimeout(8000);
                c.setReadTimeout(8000);
                c.setRequestProperty("Accept", "application/json");
                int code = c.getResponseCode();
                if (code == 200) {
                    InputStream is = c.getInputStream();
                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    byte[] buf = new byte[4096];
                    int n;
                    while ((n = is.read(buf)) != -1) bos.write(buf, 0, n);
                    JSONObject o = new JSONObject(new String(bos.toByteArray(), "UTF-8"));
                    int remoteCode = o.getInt("versionCode");
                    String versionName = o.getString("versionName");
                    String apkUrl = o.getString("apkUrl");
                    String note = o.optString("note", "");
                    int localCode = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
                    if (remoteCode > localCode) {
                        runOnUiThread(() -> showUpdateDialog(versionName, note, apkUrl));
                    }
                }
            } catch (Exception ignored) {
            }
        }).start();
    }

    private void showUpdateDialog(String ver, String note, String url) {
        if (isFinishing()) return;
        new AlertDialog.Builder(this)
                .setTitle("发现新版本 v" + ver)
                .setMessage(note + "\n\n点击下载并安装更新。")
                .setPositiveButton("立即更新", (d, w) -> downloadApk(url))
                .setNegativeButton("暂不", null)
                .show();
    }

    private void downloadApk(String url) {
        try {
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

    private void loadUrl() {
        progressBar.setProgress(5);
        progressBar.setVisibility(View.VISIBLE);
        webView.loadUrl(APP_URL);
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
