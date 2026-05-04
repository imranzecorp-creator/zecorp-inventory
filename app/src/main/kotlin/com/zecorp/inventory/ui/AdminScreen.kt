package com.zecorp.inventory.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ktx.toObjects
import com.zecorp.inventory.models.UserProfile

@Composable
fun AdminPanelScreen() {
    val db = FirebaseFirestore.getInstance()
    var users by remember { mutableStateOf<List<UserProfile>>(emptyList()) }

    LaunchedEffect(Unit) {
        db.collection("users").addSnapshotListener { snapshot, _ ->
            if (snapshot != null) {
                users = snapshot.toObjects<UserProfile>()
            }
        }
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("User Management", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(16.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(users) { user ->
                UserCard(user) { isApproved ->
                    db.collection("users").document(user.uid).update("isApproved", isApproved)
                }
            }
        }
    }
}

@Composable
fun UserCard(user: UserProfile, onToggleApproval: (Boolean) -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Row(Modifier.padding(16.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(40.dp))
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(user.displayName.ifEmpty { "Anonymous" }, style = MaterialTheme.typography.titleMedium)
                Text(user.email, style = MaterialTheme.typography.bodySmall)
            }
            if (user.role != "admin") {
                Switch(
                    checked = user.isApproved,
                    onCheckedChange = { onToggleApproval(it) }
                )
            } else {
                Text("ADMIN", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}
