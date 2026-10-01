// src/lib/constants.js
export const USER_ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  TUMMETROLOG: "tummetrolog",
  METROLOG: "metrolog",
  MEXMON: "mexmon"
};

export const MENU_ITEMS = {
  superadmin: [
    { path: "/home-superadmin", label: "Асосий", icon: "Home" },
    { path: "/regions", label: "Ҳудудлар", icon: "Map", 
      children: [
        { path: "/regions", label: "Вилоятлар", icon: "Map" },
        { path: "/cities", label: "Туман/шаҳар", icon: "Building" }
      ]
    },
    { path: "/objects", label: "Объектлар", icon: "Factory",
      children: [
        { path: "/ltds", label: "МЧЖ ва ЯТТлар", icon: "Building2" },
        { path: "/objects", label: "Объектлар", icon: "Factory" },
        { path: "/object-types", label: "Объект турлари", icon: "Building" },
        { path: "/meter-types", label: "Ҳисоблагич турлари", icon: "Gauge" }
      ]
    },
    { path: "/documents", label: "Ҳужжатлар", icon: "FileText",
      children: [
        { path: "/document-types", label: "Ҳужжат турлари", icon: "FileText" },
        { path: "/documents-by-object", label: "Объектлар бўйича", icon: "Factory" },
        { path: "/documents-by-type", label: "Ҳужжат тури бўйича", icon: "Folder" }
      ]
    },
    { path: "/plombalar", label: "Пломбалар", icon: "Shield" },
    { path: "/plomb-installation", label: "Пломба ўрнатиш", icon: "Shield" },
    { path: "/reports", label: "Ҳисоботлар", icon: "FileText" },
    { path: "/users", label: "Фойдаланувчилар", icon: "Users" },
    { path: "/logs", label: "Тизим журнали", icon: "Activity" },
  ],
  admin: [
    { path: "/home-admin", label: "Асосий", icon: "Home" },
    { path: "/objects", label: "Объектлар", icon: "Factory",
      children: [
        { path: "/ltds", label: "МЧЖ ва ЯТТлар", icon: "Building2" },
        { path: "/objects", label: "Объектлар", icon: "Factory" },
        { path: "/object-types", label: "Объект турлари", icon: "Building" },
        { path: "/meter-types", label: "Ҳисоблагич турлари", icon: "Gauge" }
      ]
    },
    { path: "/documents", label: "Ҳужжатлар", icon: "FileText",
      children: [
        { path: "/document-types", label: "Ҳужжат турлари", icon: "FileText" },
        { path: "/documents-by-object", label: "Объектлар бўйича", icon: "Factory" },
        { path: "/documents-by-type", label: "Ҳужжат тури бўйича", icon: "Folder" }
      ]
    },
    { path: "/plombalar", label: "Пломбалар", icon: "Shield" },
    { path: "/plomb-installation", label: "Пломба ўрнатиш", icon: "Shield" },
    { path: "/reports", label: "Ҳисоботлар", icon: "FileText" },
    { path: "/users", label: "Фойдаланувчилар", icon: "Users" },
  ],
  tummetrolog: [
    { path: "/home-tummetrolog", label: "Асосий", icon: "Home" },
    { path: "/reports", label: "Ҳисоботлар", icon: "FileText" },
    { path: "/documents", label: "Ҳужжатлар", icon: "FileText",
      children: [
        { path: "/documents-by-object", label: "Объектлар бўйича", icon: "Factory" },
        { path: "/documents-by-type", label: "Ҳужжат тури бўйича", icon: "Folder" }
      ]
    },
    { path: "/plomb-installation", label: "Пломба ўрнатиш", icon: "Shield" },
  ],
  metrolog: [
    { path: "/home-metrolog", label: "Асосий", icon: "Home" },
    { path: "/objects", label: "Объектлар", icon: "Factory",
      children: [
        { path: "/ltds", label: "МЧЖ ва ЯТТлар", icon: "Building2" },
        { path: "/objects", label: "Объектлар", icon: "Factory" },
      ]
    },
    { path: "/documents", label: "Ҳужжатлар", icon: "FileText",
      children: [
        { path: "/documents-by-object", label: "Объектлар бўйича", icon: "Factory" },
        { path: "/documents-by-type", label: "Ҳужжат тури бўйича", icon: "Folder" }
      ]
    },
    { path: "/plomb-installation", label: "Пломба ўрнатиш", icon: "Shield" },
    { path: "/reports", label: "Ҳисоботлар", icon: "FileText" },
  ],
  mexmon: [
    { path: "/home-mexmon", label: "Асосий", icon: "Home" },
    { path: "/reports", label: "Ҳисоботлар", icon: "FileText" },
  ]
};