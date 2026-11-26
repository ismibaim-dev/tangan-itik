package io.github.ismibaimdev.gripwise

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.github.ismibaimdev.gripwise.ui.AppNav
import io.github.ismibaimdev.gripwise.ui.LocalContainer
import io.github.ismibaimdev.gripwise.ui.theme.GripwiseTheme

class MainActivity : ComponentActivity() {
    companion object {
        const val EXTRA_ROUTE = "route"
    }

    private var pendingRoute by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        pendingRoute = intent?.getStringExtra(EXTRA_ROUTE)
        val container = (application as GripwiseApp).container
        setContent {
            val settings by container.settingsState.collectAsStateWithLifecycle()
            val s = settings ?: return@setContent
            GripwiseTheme(mode = s.themeMode) {
                CompositionLocalProvider(LocalContainer provides container) {
                    AppNav(onboarded = s.onboarded, deepLink = pendingRoute, onDeepLinkHandled = { pendingRoute = null })
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.getStringExtra(EXTRA_ROUTE)?.let { pendingRoute = it }
    }
}
