<template>
  <section class="history-section">
    <div class="history-head">
      <h3>Geçmiş Oturumlar</h3>
      <button
        class="secondary-btn small-btn"
        :disabled="historyItems.length === 0"
        @click="$emit('clear-history')"
      >
        Temizle
      </button>
    </div>

    <p v-if="historyItems.length === 0" class="history-empty">
      Kayıtlı geçmiş yok.
    </p>

    <ul v-else class="history-list">
      <li v-for="item in historyItems" :key="item.id" class="history-item">
        <div class="history-meta">
          <strong>{{ formatHistoryDate(item.createdAt) }}</strong>
          <span>{{ assignedCount(item) }} yerleşti · {{ item.unassigned.length }} yerleşemedi</span>
        </div>
        <div class="history-actions" style="display: flex; gap: 4px">
          <button
            class="secondary-btn small-btn"
            @click="$emit('download', item)"
            title="PDF İndir"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          <button class="secondary-btn small-btn" @click="$emit('restore', item)">
            Yükle
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { SeatingHistoryItem } from '@/utils/historyStorage';

defineProps<{
  historyItems: SeatingHistoryItem[]
}>();

defineEmits<{
  (e: 'clear-history'): void;
  (e: 'download', item: SeatingHistoryItem): void;
  (e: 'restore', item: SeatingHistoryItem): void;
}>();

const formatHistoryDate = (value: string) => {
  return new Date(value).toLocaleString("tr-TR");
};

const assignedCount = (entry: SeatingHistoryItem) => {
  return entry.seats.filter((seat) => seat.student).length;
};
</script>
