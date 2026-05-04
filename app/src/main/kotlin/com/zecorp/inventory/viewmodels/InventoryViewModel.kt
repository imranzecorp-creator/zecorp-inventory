package com.zecorp.inventory.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zecorp.inventory.models.InventoryItem
import com.zecorp.inventory.repository.InventoryRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class InventoryViewModel(private val repository: InventoryRepository = InventoryRepository()) : ViewModel() {
    private val _items = MutableStateFlow<List<InventoryItem>>(emptyList())
    val items: StateFlow<List<InventoryItem>> = _items.asStateFlow()

    private val _loading = MutableStateFlow(true)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    init {
        loadItems()
    }

    private fun loadItems() {
        viewModelScope.launch {
            repository.getInventoryItems().collect {
                _items.value = it
                _loading.value = false
            }
        }
    }

    fun deleteItem(id: String) {
        viewModelScope.launch {
            repository.deleteInventoryItem(id)
        }
    }

    fun saveItem(item: InventoryItem) {
        viewModelScope.launch {
            repository.saveInventoryItem(item)
        }
    }
}
