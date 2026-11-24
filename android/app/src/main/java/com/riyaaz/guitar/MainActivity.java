package com.riyaaz.guitar;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MicPermissionPlugin.class);
        registerPlugin(ThemePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
