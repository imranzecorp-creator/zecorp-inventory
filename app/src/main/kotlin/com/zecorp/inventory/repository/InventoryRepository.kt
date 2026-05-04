package com.zecorp.inventory.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.ktx.toObjects
import com.zecorp.inventory.models.InventoryItem
import com.zecorp.inventory.models.Project
import com.zecorp.inventory.models.UserProfile
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class InventoryRepository {
    private val db = FirebaseFirestore.getInstance()

    fun getInventoryItems(): Flow<List<InventoryItem>> = callbackFlow {
        val subscription = db.collection("inventory")
            .orderBy("lastUpdated", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val items = snapshot.toObjects<InventoryItem>()
                    trySend(items)
                }
            }
        awaitClose { subscription.remove() }
    }

    fun getProjects(): Flow<List<Project>> = callbackFlow {
        val subscription = db.collection("projects")
            .orderBy("updatedAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val items = snapshot.toObjects<Project>()
                    trySend(items)
                }
            }
        awaitClose { subscription.remove() }
    }

    suspend fun getUserProfile(uid: String): UserProfile? {
        return db.collection("users").document(uid).get().await().toObject(UserProfile::class.java)
    }

    suspend fun saveInventoryItem(item: InventoryItem) {
        if (item.id.isEmpty()) {
            db.collection("inventory").add(item).await()
        } else {
            db.collection("inventory").document(item.id).set(item).await()
        }
    }

    suspend fun deleteInventoryItem(itemId: String) {
        db.collection("inventory").document(itemId).delete().await()
    }
}
