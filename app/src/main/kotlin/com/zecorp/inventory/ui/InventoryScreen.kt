package com.zecorp.inventory.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.zecorp.inventory.models.InventoryItem
import com.zecorp.inventory.models.UserProfile
import com.zecorp.inventory.viewmodels.InventoryViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryScreen(
    user: UserProfile,
    viewModel: InventoryViewModel = viewModel()
) {
    val items by viewModel.items.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val isApproved = user.role == "admin" || user.isApproved

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Inventory Catalog") })
        },
        floatingActionButton = {
            if (isApproved) {
                FloatingActionButton(onClick = { /* Open Add Item Dialog */ }) {
                    Icon(Icons.Default.Add, contentDescription = "Add Item")
                }
            }
        }
    ) { padding ->
        if (loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(items) { item ->
                    InventoryItemCard(item, isApproved) {
                        viewModel.deleteItem(item.id)
                    }
                }
            }
        }
    }
}

@Composable
fun InventoryItemCard(
    item: InventoryItem,
    showActions: Boolean,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Join) {
                Column(Modifier.weight(1f)) {
                    Text(item.itemName, style = MaterialTheme.typography.titleMedium)
                    Text(item.itemCode, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
                }
                if (showActions) {
                    IconButton(onClick = onDelete) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Qty: ${item.currentQuantity} ${item.unit}", style = MaterialTheme.typography.bodyMedium)
                Text(item.location, style = MaterialTheme.typography.bodyMedium)
            }
            if (item.client.isNotEmpty()) {
                Text("Client: ${item.client}", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
