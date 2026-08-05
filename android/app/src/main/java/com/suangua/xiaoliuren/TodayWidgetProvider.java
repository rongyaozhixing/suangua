package com.suangua.xiaoliuren;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import java.util.Calendar;

/** 桌面小组件「今日卦」：按当下时间自动起卦（六宫版），联网与否都可显示 */
public class TodayWidgetProvider extends AppWidgetProvider {

    static final String ACTION_REFRESH = "com.suangua.xiaoliuren.WIDGET_REFRESH";

    private static final String[] GONG = {"大安", "留连", "速喜", "赤口", "小吉", "空亡"};
    private static final String[] GONG_LUCK = {"吉", "凶", "吉", "凶", "吉", "凶"};
    private static final String[] GONG_DESC = {
            "身未动心安 · 诸事顺遂",
            "事难成拖延 · 宜静待",
            "喜事速至 · 消息吉庆",
            "口舌是非 · 谨慎行事",
            "和合顺利 · 诸事皆宜",
            "谋事落空 · 静待时机"
    };
    private static final String[] SHICHEN = {"子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"};

    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) updateWidget(context, mgr, id);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            ComponentName cn = new ComponentName(context, TodayWidgetProvider.class);
            for (int id : mgr.getAppWidgetIds(cn)) updateWidget(context, mgr, id);
        }
    }

    /** 当前时辰序号 1-12 */
    private static int hourSeq(int hour) {
        int[] bounds = {23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21};
        for (int i = 0; i < 12; i++) {
            if (hour >= bounds[i] || (i == 0 && hour < 1)) return i + 1;
        }
        return 12;
    }

    static void updateWidget(Context context, AppWidgetManager mgr, int id) {
        Calendar cal = Calendar.getInstance();
        int y = cal.get(Calendar.YEAR);
        int m = cal.get(Calendar.MONTH) + 1;
        int d = cal.get(Calendar.DAY_OF_MONTH);
        int hour = cal.get(Calendar.HOUR_OF_DAY);

        LunarUtil.Lunar lu = LunarUtil.solarToLunar(y, m, d);
        int hs = hourSeq(hour);

        // 六宫时间起卦：大安1 留连2 速喜3 赤口4 小吉5 空亡6
        int monGong = (lu.lunarMonth - 1) % 6;
        int dayGong = (monGong + lu.lunarDay - 1) % 6;
        int hourGong = (dayGong + hs - 1) % 6;
        int g = hourGong;

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_today);
        views.setTextViewText(R.id.w_gong, GONG[g]);
        views.setTextViewText(R.id.w_luck, GONG_LUCK[g]);
        views.setTextViewText(R.id.w_desc, GONG_DESC[g]);
        views.setTextViewText(R.id.w_date, "农历" + lu.monthCn + lu.dayCn + " · " + SHICHEN[hs - 1] + "时");

        // 点击小组件 → 打开 App
        Intent open = new Intent(context, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(context, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pi);

        // 刷新按钮
        Intent refresh = new Intent(context, TodayWidgetProvider.class);
        refresh.setAction(ACTION_REFRESH);
        PendingIntent rp = PendingIntent.getBroadcast(context, 1, refresh,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.w_refresh, rp);

        mgr.updateAppWidget(id, views);
    }
}
