package com.zecorp.inventory.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.google.firebase.firestore.FirebaseFirestore
import com.zecorp.inventory.models.InventoryItem

@Composable
fun DashboardScreen() {
    val db = FirebaseFirestore.getInstance()
    var totalItems by remember { mutableLongStateOf(0L) }
    var lowStockCount by remember { mutableLongStateOf(0L) }

    LaunchedEffect(Unit) {
        db.collection("inventory").get().addOnSuccessListener { snapshot ->
            totalItems = snapshot.size().toLong()
            val items = snapshot.toObjects(InventoryItem::class.java)
            lowStockCount = items.count { it.currentQuantity < 10 }.toLong()
        }
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("System Overview", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(24.dp))
        
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                StatCard("Total SKU", totalItems.toString())
            }
            item {
                StatCard("Low Stock", lowStockCount.toString(), isAlert = lowStockCount > 0)
            }
            // Add more as needed
        }
    }
}

@Composable
fun StatCard(label: String, value: String, isAlert: Boolean = false) {
    Card(
        modifier = Modifier.fillMaxWidth().height(120.dp),
        colors = if (isAlert) CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer) 
                 else CardDefaults.cardColors()
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.Center) {
            Text(label, style = MaterialTheme.typography.labelMedium)
            Spacer(Modifier.height(8.dp))
            Text(value, style = MaterialTheme.typography.displaySmall)
        }
    }
}
