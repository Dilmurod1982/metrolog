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
      { path: "/home", label: "Асосий", icon: "Home" },
      { path: "/regions", label: "Ҳудудлар", icon: "Map", 
        children: [
          { path: "/regions", label: "Вилоятлар", icon: "MapPin" },
          { path: "/cities", label: "Туман/шаҳар", icon: "Building" }
        ]
      },
      { path: "/ltds", label: "МЧЖ ва ЯТТлар", icon: "Building2" },
      { path: "/objects", label: "Объектлар", icon: "Factory" },
      { path: "/reports", label: "Ҳисоботлар", icon: "FileText" },
      { path: "/logs", label: "Тизим журнали", icon: "Activity" },
      { path: "/users", label: "Фойдаланувчилар", icon: "Users" }
    ],
    admin: [
      { path: "/home", label: "Асосий", icon: "Home" },
      { path: "/ltds", label: "МЧЖ ва ЯТТлар", icon: "Building2" },
      { path: "/objects", label: "Объектлар", icon: "Factory" },
      { path: "/reports", label: "Ҳисоботлар", icon: "FileText" },
      { path: "/users", label: "Фойдаланувчилар", icon: "Users" }
    ],
    tummetrolog: [
      { path: "/home", label: "Асосий", icon: "Home" },
      { path: "/objects", label: "Объектлар", icon: "Factory" },
      { path: "/reports", label: "Ҳисоботлар", icon: "FileText" }
    ],
    metrolog: [
      { path: "/home", label: "Асосий", icon: "Home" },
      { path: "/ltds", label: "МЧЖ ва ЯТТлар", icon: "Building2" },
      { path: "/objects", label: "Объектлар", icon: "Factory" },
      { path: "/reports", label: "Ҳисоботлар", icon: "FileText" }
    ],
    mexmon: [
      { path: "/home", label: "Асосий", icon: "Home" },
      { path: "/reports", label: "Ҳисоботлар", icon: "FileText" }
    ]
  };