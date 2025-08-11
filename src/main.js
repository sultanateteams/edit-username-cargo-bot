import { createApp } from "vue";
import App from "./App.vue";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-vue-3/dist/bootstrap-vue-3.css";
import BootstrapVue3 from "bootstrap-vue-3";

import PrimeVue from "primevue/config";
import InputText from "primevue/inputtext";
import FloatLabel from "primevue/floatlabel";
import Aura from "@primeuix/themes/aura";

const app = createApp(App);

app.use(BootstrapVue3);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
});
app.component("InputText", InputText);
app.component("FloatLabel", FloatLabel);

app.mount("#app");






















