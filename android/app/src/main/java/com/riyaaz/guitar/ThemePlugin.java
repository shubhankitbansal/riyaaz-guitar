package com.riyaaz.guitar;

import android.app.Activity;
import android.graphics.Color;
import android.view.Window;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Matches Android's status/navigation bars to the app theme (dark icons on light themes). */
@CapacitorPlugin(name = "AppTheme")
public class ThemePlugin extends Plugin {

    @PluginMethod
    public void setBars(PluginCall call) {
        final boolean light = Boolean.TRUE.equals(call.getBoolean("light", false));
        final String color = call.getString("color", "#14110f");
        final Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            Window window = activity.getWindow();
            try {
                int c = Color.parseColor(color);
                window.setStatusBarColor(c);
                window.setNavigationBarColor(c);
            } catch (IllegalArgumentException ignored) {
                // keep the current colour
            }
            WindowInsetsControllerCompat bars = new WindowInsetsControllerCompat(window, window.getDecorView());
            bars.setAppearanceLightStatusBars(light);
            bars.setAppearanceLightNavigationBars(light);
        });
        call.resolve(new JSObject());
    }
}
