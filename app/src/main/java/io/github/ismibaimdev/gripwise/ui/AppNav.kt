package io.github.ismibaimdev.gripwise.ui

import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import io.github.ismibaimdev.gripwise.AppContainer
import io.github.ismibaimdev.gripwise.ui.components.Tab
import io.github.ismibaimdev.gripwise.ui.screens.CalibrateScreen
import io.github.ismibaimdev.gripwise.ui.screens.ConnectScreen
import io.github.ismibaimdev.gripwise.ui.screens.DoneScreen
import io.github.ismibaimdev.gripwise.ui.screens.ExercisesScreen
import io.github.ismibaimdev.gripwise.ui.screens.ExportScreen
import io.github.ismibaimdev.gripwise.ui.screens.HomeScreen
import io.github.ismibaimdev.gripwise.ui.screens.ProfileScreen
import io.github.ismibaimdev.gripwise.ui.screens.ProfileSetupScreen
import io.github.ismibaimdev.gripwise.ui.screens.ProgressScreen
import io.github.ismibaimdev.gripwise.ui.screens.SessionScreen
import io.github.ismibaimdev.gripwise.ui.screens.WelcomeScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

val LocalContainer = staticCompositionLocalOf<AppContainer> { error("No AppContainer") }

object Routes {
    const val WELCOME = "welcome"
    const val SETUP = "setup"
    const val CONNECT = "connect"
    const val RECONNECT = "reconnect"
    const val CALIBRATE = "calibrate"
    const val HOME = "home"
    const val EXERCISES = "exercises"
    const val PROGRESS = "progress"
    const val EXPORT = "export"
    const val PROFILE = "profile"
    const val GLOVE = "glove"
    fun session(id: String) = "session/$id"
    fun done(id: Long) = "done/$id"
    fun review(id: Long) = "review/$id"
}

fun NavHostController.tab(tab: Tab) {
    val route = when (tab) { Tab.Home -> Routes.HOME; Tab.Exercises -> Routes.EXERCISES; Tab.Progress -> Routes.PROGRESS; Tab.Profile -> Routes.PROFILE }
    navigate(route) {
        popUpTo(Routes.HOME) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

fun NavHostController.goHome() = navigate(Routes.HOME) { popUpTo(0) { inclusive = true }; launchSingleTop = true }

@Composable
fun AppNav(onboarded: Boolean, deepLink: String?, onDeepLinkHandled: () -> Unit) {
    val nav = rememberNavController()
    val container = LocalContainer.current
    val scope = rememberCoroutineScope { Dispatchers.Main.immediate }

    LaunchedEffect(deepLink, onboarded) {
        if (deepLink != null && onboarded) {
            nav.navigate(deepLink) { launchSingleTop = true }
            onDeepLinkHandled()
        }
    }

    fun finishOnboarding() {
        scope.launch {
            container.settings.setOnboarded(true)
            nav.goHome()
        }
    }

    NavHost(
        navController = nav,
        startDestination = if (onboarded) Routes.HOME else Routes.WELCOME,
        enterTransition = { EnterTransition.None },
        exitTransition = { ExitTransition.None },
    ) {
        composable(Routes.WELCOME) {
            WelcomeScreen(
                onStart = { scope.launch { container.settings.setDemo(false) }; nav.navigate(Routes.SETUP) },
                onDemo = { scope.launch { container.settings.setDemo(true) }; nav.navigate(Routes.SETUP) },
            )
        }
        composable(Routes.SETUP) { ProfileSetupScreen(onBack = { nav.popBackStack() }, onDone = { nav.navigate(Routes.CONNECT) }) }
        composable(Routes.CONNECT) {
            ConnectScreen(onBack = { nav.popBackStack() }, onContinue = { nav.navigate(Routes.CALIBRATE) }, onLater = { finishOnboarding() })
        }
        composable(Routes.RECONNECT) {
            ConnectScreen(onBack = { nav.popBackStack() }, onContinue = { nav.popBackStack() }, onLater = { nav.popBackStack() }, settingsContext = true)
        }
        composable(Routes.CALIBRATE) {
            CalibrateScreen(settingsContext = false, onBack = { nav.popBackStack() }, onDone = { finishOnboarding() }, onConnect = { nav.navigate(Routes.RECONNECT) })
        }
        composable(Routes.GLOVE) {
            CalibrateScreen(settingsContext = true, onBack = { nav.popBackStack() }, onDone = { nav.popBackStack() }, onConnect = { nav.navigate(Routes.RECONNECT) })
        }
        composable(Routes.HOME) {
            HomeScreen(
                onTab = { nav.tab(it) },
                onSession = { nav.navigate(Routes.session(it)) },
                onReview = { nav.navigate(Routes.review(it)) },
                onGlove = { nav.navigate(Routes.GLOVE) },
            )
        }
        composable(Routes.EXERCISES) { ExercisesScreen(onTab = { nav.tab(it) }, onSession = { nav.navigate(Routes.session(it)) }) }
        composable(Routes.PROGRESS) { ProgressScreen(onTab = { nav.tab(it) }, onExport = { nav.navigate(Routes.EXPORT) }) }
        composable(Routes.EXPORT) { ExportScreen(onBack = { nav.popBackStack() }) }
        composable(Routes.PROFILE) {
            ProfileScreen(
                onTab = { nav.tab(it) },
                onGlove = { nav.navigate(Routes.GLOVE) },
                onExport = { nav.navigate(Routes.EXPORT) },
                onErased = { nav.navigate(Routes.WELCOME) { popUpTo(0) { inclusive = true } } },
            )
        }
        composable("session/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) { entry ->
            SessionScreen(
                exerciseId = entry.arguments?.getString("id").orEmpty(),
                onExit = { nav.popBackStack() },
                onFinished = { id -> nav.navigate(Routes.done(id)) { popUpTo(Routes.HOME) } },
                onHome = { nav.goHome() },
                onConnect = { nav.navigate(Routes.RECONNECT) },
            )
        }
        composable("done/{sid}", arguments = listOf(navArgument("sid") { type = NavType.LongType })) { entry ->
            DoneScreen(entry.arguments?.getLong("sid") ?: 0L, review = false, onHome = { nav.goHome() }, onProgress = { nav.navigate(Routes.PROGRESS) { popUpTo(Routes.HOME) } }, onAgain = { nav.navigate(Routes.session(it)) })
        }
        composable("review/{sid}", arguments = listOf(navArgument("sid") { type = NavType.LongType })) { entry ->
            DoneScreen(entry.arguments?.getLong("sid") ?: 0L, review = true, onHome = { nav.popBackStack() }, onProgress = { nav.navigate(Routes.PROGRESS) }, onAgain = { nav.navigate(Routes.session(it)) })
        }
    }
}
