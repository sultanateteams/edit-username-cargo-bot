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
    <b-form @submit.prevent="onSubmit" v-else>
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
          :key="opt.id"
          action
          @click="selectOption(opt)"
        >
          <strong>{{ opt.first_name }} {{ opt.last_name }}</strong>
        </b-list-group-item>
      </b-list-group>

      <!-- Qo'shimcha input -->
      <b-form-input
        v-model="extraText"
        placeholder="Qo'shimcha ma'lumot kiriting"
        class="mt-3"
      ></b-form-input>

      <!-- Tugma faqat shart bajarilganda -->
      <b-button
        v-if="selected && extraText.trim()"
        type="submit"
        variant="primary"
        class="mt-3"
      >
        Yuborish
      </b-button>
    </b-form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";
import supabase from "../config/supabazaClient";

const errorText = ref("");
const loading = ref(false);
const search = ref("");
const selected = ref(null);
const extraText = ref("");
const showDropdown = ref(false);
const searchInput = ref(null);
const options = ref([]);

const queryParams = new URLSearchParams(window.location.search);
const org_id = queryParams.get("org_id") || null;
const onlyNullID = queryParams.get("onlyNullID") || false;

const Telegram = window.Telegram?.WebApp;

onMounted(async () => {
  if (Telegram) {
    Telegram.ready();
    Telegram.onEvent("mainButtonClicked", handleMainButtonClick);
  }

  loading.value = true;
  if (org_id) {
    let query = supabase
      .from("users")
      .select("*")
      .eq("state", 1)
      .or(`org_id.eq.${org_id},orgs_id.cs.{${org_id}}`);

    if (onlyNullID) query = query.is("user_id", null);

    const { data, error } = await query;

    if (error) {
      errorText.value =
        "Supabase xato: " + (error.message || JSON.stringify(error));
    } else {
      options.value = data || [];
    }
  } else {
    errorText.value = "Organization ID not found";
  }
  loading.value = false;

  await nextTick();
  searchInput.value?.focus();
  showDropdown.value = true;
});

const filteredOptions = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return options.value;

  return options.value.filter((opt) =>
    [
      opt.first_name,
      opt.last_name,
      opt.user_id,
      opt.telegram_number,
      opt.telegram_id,
      opt.phone_number,
    ]
      .filter((field) => field !== null && field !== undefined)
      .some((field) => String(field).toLowerCase().includes(term))
  );
});

const selectOption = (opt) => {
  selected.value = opt.id;
  search.value = `${opt.first_name} ${opt.last_name}`;
  showDropdown.value = false;
};

const onSubmit = () => {
  console.log("Tanlangan ID:", selected.value);
  console.log("Qo'shimcha matn:", extraText.value);
};

const handleMainButtonClick = () => {
  const queryId = Telegram.initDataUnsafe?.query_id;
  const payload = JSON.stringify({
    changeUserID: { userId: selected.value, newUser_id: extraText.value },
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

watch([selected, extraText], ([sel, extra]) => {
  if (sel && extra.trim().length) {
    if (Telegram?.MainButton) {
      Telegram.MainButton.text = "Register";
      Telegram.MainButton.show();
    }
  } else {
    Telegram?.MainButton?.hide();
  }
});
</script>
