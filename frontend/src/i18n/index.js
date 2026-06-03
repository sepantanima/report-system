// src/i18n/index.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// FA modules
import faButtons from "./fa/buttons";
import faCommon from "./fa/common";
import faMenus from "./fa/menus";
import faMessages from "./fa/messages";
import faPages from "./fa/pages";
import faTables from "./fa/tables";

// EN modules
import enButtons from "./en/buttons";
import enCommon from "./en/common";
import enMenus from "./en/menus";
import enMessages from "./en/messages";
import enPages from "./en/pages";
import enTables from "./en/tables";

i18n.use(initReactI18next).init({
    resources: {
        fa: {
            buttons: faButtons,
            common: faCommon,
            menus: faMenus,
            messages: faMessages,
            pages: faPages,
            tables: faTables
        },
        en: {
            buttons: enButtons,
            common: enCommon,
            menus: enMenus,
            messages: enMessages,
            pages: enPages,
            tables: enTables
        }
    },
    lng: localStorage.getItem("lang") || "fa",
    fallbackLng: "fa",
    interpolation: {
        escapeValue: false
    }
});

export default i18n;
