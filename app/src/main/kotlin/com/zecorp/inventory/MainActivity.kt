package com.zecorp.inventory

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.google.firebase.auth.FirebaseAuth
import com.zecorp.inventory.models.UserProfile
import com.zecorp.inventory.repository.InventoryRepository
import kotlinx.coroutines.tasks.await

sealed class Screen(val route: String, val label: String, val icon: ImageVector) {
    object Dashboard : Screen("dashboard", "Dashboard", Icons.Default.Dashboard)
    object Inventory : Screen("inventory", "Inventory", Icons.Default.List)
    object Projects : Screen("projects", "Projects", Icons.Default.Work)
    object Admin : Screen("admin", "Admin", Icons.Default.Shield)
}

class MainActivity : ComponentActivity() {
    private val auth = FirebaseAuth.getInstance()
    private val repository = InventoryRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            var userProfile by remember { mutableStateOf<UserProfile?>(null) }
            var loading by remember { mutableStateOf(true) }

            LaunchedEffect(Unit) {
                val user = auth.currentUser
                if (user != null) {
                    userProfile = repository.getUserProfile(user.uid)
                }
                loading = false
            }

            MaterialTheme(
                colorScheme = darkColorScheme()
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    if (loading) {
                        Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    } else {
                        val profile = userProfile
                        if (profile == null) {
                            LoginScreen(onLoginSuccess = {
                                // Trigger refresh
                            })
                        } else if (!profile.isApproved && profile.role != "admin") {
                            ApprovalPendingScreen(profile)
                        } else {
                            MainAppContent(profile)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun MainAppContent(user: UserProfile) {
    val navController = rememberNavController()
    val screens = listOf(
        Screen.Dashboard,
        Screen.Inventory,
        Screen.Projects
    ).let { if (user.role == "admin") it + Screen.Admin else it }

    Scaffold(
        bottomBar = {
            NavigationBar {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                screens.forEach { screen ->
                    NavigationBarItem(
                        icon = { Icon(screen.icon, contentDescription = null) },
                        label = { Text(screen.label) },
                        selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(navController, startDestination = Screen.Dashboard.route, Modifier.padding(innerPadding)) {
            composable(Screen.Dashboard.route) { DashboardScreen() }
            composable(Screen.Inventory.route) { InventoryScreen(user) }
            composable(Screen.Projects.route) { ProjectsScreen() }
            composable(Screen.Admin.route) { AdminPanelScreen() }
        }
    }
}

@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally
    ) {
        Text("ZECORP OS", style = MaterialTheme.typography.headlineLarge)
        Spacer(Modifier.height(8.dp))
        Text("Enterprise Operating System", style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(32.dp))
        Button(onClick = { /* Implement Google Sign-In */ }) {
            Text("Sign in with Google")
        }
    }
}

@Composable
fun ApprovalPendingScreen(user: UserProfile) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally
    ) {
        Icon(Icons.Default.Error, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.error)
        Spacer(Modifier.height(16.dp))
        Text("Awaiting Approval", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(16.dp))
        Text(
            "Your account (${user.email}) is currently pending admin approval. Please contact your administrator.",
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
        Spacer(Modifier.height(32.dp))
        OutlinedButton(onClick = { FirebaseAuth.getInstance().signOut() }) {
            Text("Log Out")
        }
    }
}

// Placeholder for screens
@Composable fun DashboardScreen() { Text("Dashboard Content") }
@Composable fun InventoryScreen(user: UserProfile) { Text("Inventory List") }
@Composable fun ProjectsScreen() { Text("Projects Content") }
@Composable fun AdminPanelScreen() { Text("Admin Panel") }
