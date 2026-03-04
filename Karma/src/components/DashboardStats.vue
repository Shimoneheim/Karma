<template>
  <div
    v-if="stats"
    class="dashboard-panel"
    :class="{ 'warning-border': stats.isOverCapacity }"
  >
    <div class="dashboard-header">
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Toplam Öğrenci</span>
          <span class="stat-value">{{ stats.totalStudents }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Toplam Kapasite</span>
          <span class="stat-value">{{ stats.totalCapacity }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Doluluk Oranı</span>
          <span
            class="stat-value"
            :class="{ 'warning-text': stats.occupancyRate > 95 }"
          >
            %{{ stats.occupancyRate.toFixed(1) }}
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Boş Koltuk</span>
          <span class="stat-value">{{ stats.emptySeats }}</span>
        </div>
      </div>

      <button @click="$emit('download')" class="primary-btn quick-download-btn">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
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
        <span>İndir</span>
      </button>
    </div>

    <div v-if="stats.isOverCapacity" class="capacity-warning">
      ⚠️ Kapasite yetersiz! {{ stats.unassignedCount }} öğrenci
      yerleştirilemedi.
    </div>
    <div
      v-if="stats.deadlockResolved"
      class="capacity-warning"
      style="color: var(--input-focus); border-color: var(--input-border)"
    >
      ⚠️ Algoritma bir çıkmaza girdiğinden, bazı öğrencileri yerleştirebilmek
      için katı kurallar esnetilmiştir.
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  stats: {
    totalStudents: number;
    totalCapacity: number;
    occupancyRate: number;
    emptySeats: number;
    isOverCapacity: boolean;
    unassignedCount: number;
    qualityScore: number;
    deadlockResolved: boolean;
  };
}>();

defineEmits(["download"]);
</script>
