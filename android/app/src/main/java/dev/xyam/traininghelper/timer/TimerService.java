package dev.xyam.traininghelper.timer;

import android.annotation.SuppressLint;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

/**
 * Servicio en primer plano mientras dura el entrenamiento:
 * - mantiene la notificación fija con la cuenta regresiva (Live Update),
 * - muestra la burbuja flotante con el timer sobre otras apps cuando salís de la app.
 */
public class TimerService extends Service {
    private static final String ACTION_REFRESH = "refresh";
    private static final String ACTION_STOP = "stop";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private WindowManager windowManager;
    private LinearLayout bubble;
    private TextView bubbleTime, bubbleName;
    private WindowManager.LayoutParams bubbleParams;
    private int lastIndex = -1;
    private boolean lastPaused;

    // ---- API estática para el plugin y los receivers ----

    public static void start(Context c) {
        ContextCompat.startForegroundService(c, new Intent(c, TimerService.class).setAction(ACTION_REFRESH));
    }

    /** Actualiza notificación y burbuja si el servicio está corriendo (no lo arranca). */
    public static void refresh(Context c) {
        TimerStore.Snapshot s = TimerStore.load(c, System.currentTimeMillis());
        if (!s.active) return;
        TimerNotifications.updateOngoing(c, s);
        try {
            c.startService(new Intent(c, TimerService.class).setAction(ACTION_REFRESH));
        } catch (Exception ignored) {
            // la app no puede iniciar servicios desde segundo plano; la notificación igual quedó actualizada
        }
    }

    public static void stop(Context c) {
        try {
            c.startService(new Intent(c, TimerService.class).setAction(ACTION_STOP));
        } catch (Exception e) {
            c.stopService(new Intent(c, TimerService.class));
        }
        TimerNotifications.cancelAll(c);
    }

    // ---- ciclo de vida ----

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        TimerStore.Snapshot s = TimerStore.load(this, System.currentTimeMillis());
        // Siempre hay que llamar a startForeground después de startForegroundService.
        ServiceCompat.startForeground(
            this,
            TimerNotifications.ONGOING_ID,
            TimerNotifications.buildOngoing(this, s),
            Build.VERSION.SDK_INT >= 34 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE : 0
        );
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_STOP.equals(action) || !s.active || s.finished()) {
            shutdown();
            return START_NOT_STICKY;
        }
        updateBubbleVisibility();
        tick();
        return START_STICKY;
    }

    private void shutdown() {
        handler.removeCallbacksAndMessages(null);
        hideBubble();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        hideBubble();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    /** Cada 250ms: refresca la burbuja y detecta cambios de etapa/pausa para la notificación. */
    private final Runnable ticker = this::tick;

    private void tick() {
        handler.removeCallbacks(ticker);
        TimerStore.Snapshot s = TimerStore.load(this, System.currentTimeMillis());
        if (!s.active || s.finished()) {
            // La alarma final se encarga del aviso y de limpiar el estado; acá solo cerramos.
            shutdown();
            return;
        }
        if (s.index != lastIndex || s.paused != lastPaused) {
            lastIndex = s.index;
            lastPaused = s.paused;
            TimerNotifications.updateOngoing(this, s);
        }
        renderBubble(s);
        handler.postDelayed(ticker, bubble != null ? 250 : 1000);
    }

    // ---- burbuja flotante ----

    private boolean shouldShowBubble() {
        return TimerStore.isBubbleEnabled(this)
            && !TimerStore.isAppVisible(this)
            && (Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(this));
    }

    private void updateBubbleVisibility() {
        if (shouldShowBubble()) showBubble();
        else hideBubble();
    }

    private int dp(float v) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()));
    }

    @SuppressLint("ClickableViewAccessibility")
    private void showBubble() {
        if (bubble != null) return;
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        if (windowManager == null) return;

        bubble = new LinearLayout(this);
        bubble.setOrientation(LinearLayout.VERTICAL);
        bubble.setGravity(Gravity.CENTER);
        bubble.setPadding(dp(12), dp(6), dp(12), dp(7));
        bubble.setElevation(dp(6));

        bubbleTime = new TextView(this);
        bubbleTime.setTextColor(Color.WHITE);
        bubbleTime.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        bubbleTime.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
        bubbleTime.setGravity(Gravity.CENTER);

        bubbleName = new TextView(this);
        bubbleName.setTextColor(0xE6FFFFFF);
        bubbleName.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        bubbleName.setTypeface(Typeface.DEFAULT_BOLD);
        bubbleName.setGravity(Gravity.CENTER);
        bubbleName.setMaxWidth(dp(110));
        bubbleName.setSingleLine(true);
        bubbleName.setEllipsize(TextUtils.TruncateAt.END);

        bubble.addView(bubbleTime);
        bubble.addView(bubbleName);

        int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        bubbleParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );
        bubbleParams.gravity = Gravity.TOP | Gravity.START;
        int[] pos = TimerStore.bubblePosition(this);
        bubbleParams.x = pos[0];
        bubbleParams.y = pos[1];

        // Arrastrar para mover; tocar para abrir la app.
        bubble.setOnTouchListener(new View.OnTouchListener() {
            private int startX, startY;
            private float downX, downY;
            private boolean moved;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        startX = bubbleParams.x;
                        startY = bubbleParams.y;
                        downX = e.getRawX();
                        downY = e.getRawY();
                        moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        float dx = e.getRawX() - downX, dy = e.getRawY() - downY;
                        if (Math.abs(dx) > dp(6) || Math.abs(dy) > dp(6)) moved = true;
                        bubbleParams.x = startX + Math.round(dx);
                        bubbleParams.y = startY + Math.round(dy);
                        if (bubble != null) windowManager.updateViewLayout(bubble, bubbleParams);
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (moved) {
                            TimerStore.saveBubblePosition(TimerService.this, bubbleParams.x, bubbleParams.y);
                        } else {
                            try {
                                TimerNotifications.openApp(TimerService.this).send();
                            } catch (Exception ignored) {
                            }
                        }
                        return true;
                }
                return false;
            }
        });

        try {
            windowManager.addView(bubble, bubbleParams);
        } catch (Exception e) {
            bubble = null;
        }
    }

    private void hideBubble() {
        if (bubble != null && windowManager != null) {
            try {
                windowManager.removeView(bubble);
            } catch (Exception ignored) {
            }
        }
        bubble = null;
    }

    private void renderBubble(TimerStore.Snapshot s) {
        updateBubbleVisibility();
        if (bubble == null) return;
        TimerStore.Stage cur = s.current();
        if (cur == null) return;
        bubbleTime.setText((s.paused ? "⏸ " : "") + TimerStore.formatMs(s.remainingMs));
        bubbleName.setText(cur.name);
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(dp(18));
        int color;
        try {
            color = Color.parseColor(cur.color);
        } catch (Exception e) {
            color = Color.parseColor("#22c55e");
        }
        // Color de la etapa oscurecido para que el texto blanco se lea bien
        bg.setColor(Color.rgb(Color.red(color) * 7 / 10, Color.green(color) * 7 / 10, Color.blue(color) * 7 / 10));
        bg.setStroke(dp(1), 0x55FFFFFF);
        bubble.setBackground(bg);
    }
}
