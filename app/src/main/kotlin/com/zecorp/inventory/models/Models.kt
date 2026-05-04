package com.zecorp.inventory.models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId

data class UserProfile(
    @DocumentId val uid: String = "",
    val email: String = "",
    val displayName: String = "",
    val photoURL: String = "",
    val role: String = "user",
    val isApproved: Boolean = false,
    val createdAt: Timestamp? = null
)

data class InventoryItem(
    @DocumentId val id: String = "",
    val itemCode: String = "",
    val itemName: String = "",
    val itemDescription: String = "",
    val category: String = "",
    val currentQuantity: Int = 0,
    val unit: String = "",
    val location: String = "",
    val outlet: String = "",
    val client: String = "",
    val jobNumber: String = "",
    val status: String = "In Stock",
    val lastUpdated: Timestamp? = null,
    val imageUrl: String? = null
)

data class Project(
    @DocumentId val id: String = "",
    val name: String = "",
    val description: String = "",
    val client: String = "",
    val status: String = "Active",
    val items: List<String> = emptyList(),
    val totalQuantityIn: Int = 0,
    val totalQuantityOut: Int = 0,
    val outlet: String = "",
    val location: String = "",
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)

data class ApprovedEmail(
    @DocumentId val id: String = "",
    val email: String = "",
    val addedBy: String = "",
    val createdAt: Timestamp? = null
)
