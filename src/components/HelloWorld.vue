<template>
  <div class="p-4">
    <!-- Xato matni -->
    <h1 class="text-danger" v-if="errorText">
      {{ errorText }}
    </h1>

    <!-- Loader -->
    <div
      v-if="loading"
      class="d-flex justify-content-center align-items-center"
    >
      <b-spinner label="Yuklanmoqda..."></b-spinner>
      <span class="ms-2">Ma'lumotlar yuklanmoqda...</span>
    </div>

    <!-- Forma -->
    <b-form v-else @submit.prevent="onSubmit">
      <!-- Checkbox: Faqat ID si yo‘q -->
      <b-form-checkbox v-model="onlyNullID" class="mb-3">
  <span :style="{ textDecoration: !onlyNullID ? 'line-through' : 'none' }">
    ID berilmagan mijozlar
  </span>
</b-form-checkbox>

      <!-- Qidirish input -->
      <b-form-input
        ref="searchInput"
        v-model="search"
        placeholder="Qidirish..."
        class="mb-2"
        @focus="showDropdown = true"
        @input="showDropdown = true"
      ></b-form-input>

      <!-- Dinamik chiqadigan variantlar -->
      <b-list-group
        v-if="showDropdown && filteredOptions.length"
        style="max-height: 200px; overflow-y: auto"
      >
        <b-list-group-item
          v-for="opt in filteredOptions"
          :key="opt.user_id || opt.tempId"
          action
          @click="selectOption(opt)"
        >
          <strong>{{ opt.first_name }} {{ opt.last_name }}</strong>
        </b-list-group-item>
      </b-list-group>

      <!-- Cargo list inputlari -->
      <div v-if="selectedUser" class="mt-4">
        <h5>Cargo ma'lumotlari</h5>

        <div
          v-for="transport in transportTypes"
          :key="transport"
          class="mb-3 p-2 border rounded"
        >
          <label class="form-label fw-bold">{{
            transport.toUpperCase()
          }}</label>

          <b-form-input
            v-model="cargoInputs[transport].cargo_id"
            :placeholder="`${transport} cargo_id`"
            class="mb-2"
          ></b-form-input>
        </div>
      </div>
    </b-form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";
import supabase from "../config/supabazaClient";

const errorText = ref("");
const loading = ref(false);
const search = ref("");
const selectedUser = ref(null);
const showDropdown = ref(false);
const searchInput = ref(null);
const options = ref([]);
const onlyNullID = ref(true);

const queryParams = new URLSearchParams(window.location.search);
const org_id = queryParams.get("org_id") || null;

const Telegram = window.Telegram?.WebApp;

const transportTypes = ["auto", "air", "rail", "sea"];
const cargoInputs = ref({});

// Cargo inputlarni tayyorlab beradigan funksiya
const initCargoInputs = (cargo_list) => {
  const init = {};
  transportTypes.forEach((t) => {
    const found = cargo_list?.find((c) => c.transport_type === t);
    init[t] = {
      cargo_id: found ? found.cargo_id : "",
      transport_type: t,
    };
  });
  cargoInputs.value = init;
};

// RPC dan foydalanuvchilarni olish va filtr
const fetchUsers = async () => {
  loading.value = true;
  try {
    if (!org_id) {
      errorText.value = "Organization ID not found";
      return;
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_users_with_cargos_by_org",
      { p_org_id: org_id }
    );

    if (rpcError) {
      errorText.value =
        "Supabase RPC xato: " + (rpcError.message || JSON.stringify(rpcError));
      return;
    }

    let result = rpcData || [];

    // 🔹 Default filtr: faqat ID yo‘q yoki cargo_id falsy
    if (onlyNullID.value) {
      result = result.filter((row) => {
        const cargoList = row.cargo_list || [];
        const hasValidCargo = cargoList.some((c) => c.cargo_id);
        return row.user_id === null || !hasValidCargo;
      });
    }

    // Temporary ID larni qo‘shamiz agar user_id null bo‘lsa
    result = result.map((row, idx) => ({
      ...row,
      tempId: row.user_id ? null : `temp-${idx}`,
    }));

    options.value = result;
  } catch (err) {
    errorText.value = "Foydalanuvchilarni olishda xatolik";
    console.error(err);
  } finally {
    loading.value = false;
    await nextTick();
    searchInput.value?.focus();
    showDropdown.value = true;
  }
};

onMounted(() => {
  if (Telegram) {
    Telegram.ready();
    Telegram.onEvent("mainButtonClicked", handleMainButtonClick);
  }
  fetchUsers();
});

// Foydalanuvchilarni filtrlash qidiruv bilan
const filteredOptions = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return options.value;

  return options.value.filter((opt) => {
    const fields = [
      opt.first_name,
      opt.last_name,
      opt.user_id,
      ...(opt.cargo_list?.map((c) => c.cargo_id) || []),
    ].filter(Boolean);
    return fields.some((f) => String(f).toLowerCase().includes(term));
  });
});

// Checkbox o‘zgarganda qayta fetch qilish
watch(onlyNullID, () => {
  fetchUsers();
});

// User tanlash
const selectOption = (opt) => {
  selectedUser.value = opt;
  search.value = `${opt.first_name} ${opt.last_name}`;
  showDropdown.value = false;
  initCargoInputs(opt.cargo_list || []);
};

// Auto cargo_id ni kuzatib Telegram MainButtonni boshqarish
watch(
  () => cargoInputs.value.auto?.cargo_id,
  (newVal) => {
    if (newVal && newVal.trim().length) {
      if (Telegram?.MainButton) {
        Telegram.MainButton.text = "Saqlash";
        Telegram.MainButton.show();
      }
    } else {
      Telegram?.MainButton?.hide();
    }
  }
);

// Submit tugmasi (forma ichida)
const onSubmit = () => {
  console.log("Tanlangan user:", selectedUser.value);
  console.log("Cargo inputs:", cargoInputs.value);
};

// Telegram MainButton bosilganda chaqiriladigan funksiya
const handleMainButtonClick = () => {
  const queryId = Telegram.initDataUnsafe?.query_id;

  const payload = JSON.stringify({
    add_user_cargo_ids: {
      user: selectedUser.value,
      cargos: cargoInputs.value,
      org_id,
    },
    queryId,
  });

  if (queryId) {
    fetch("https://telegram-bota-da4625226d63.herokuapp.com/web-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
  } else {
    Telegram.sendData(payload);
  }
};
</script>
