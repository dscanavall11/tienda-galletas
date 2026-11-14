// Paleta "rosita": fondos rosa pálido, acento frambuesa y textos en ciruela
// oscuro. El acento con texto blanco da ~4,6:1 de contraste (AA).
export const paleta = {
  primario: '#d6336c',
  primarioHover: '#e64980',
  primarioActivo: '#b02a5b',
  fondo: '#fff4f8',
  rosaClaro: '#ffe3ed',
  borde: '#f7d0df',
  bordeSuave: '#fbe3ec',
  texto: '#4a2433',
  textoSecundario: '#8c5a70',
  textoTerciario: '#b58aa0',
  error: '#c92a2a',
  ciruela: '#4a1d36',
  ciruelaSel: '#7b2d57',
  ciruelaTexto: '#f3c6d9',
};

export const themeTokens = {
  token: {
    colorPrimary: paleta.primario,
    colorInfo: paleta.primario,
    colorLink: paleta.primario,
    colorLinkHover: paleta.primarioHover,
    colorLinkActive: paleta.primarioActivo,
    colorBgLayout: paleta.fondo,
    colorBgContainer: '#ffffff',
    colorBorder: paleta.borde,
    colorBorderSecondary: paleta.bordeSuave,
    colorText: paleta.texto,
    colorTextSecondary: paleta.textoSecundario,
    colorTextTertiary: paleta.textoTerciario,
    borderRadius: 12,
    borderRadiusLG: 18,
    borderRadiusSM: 8,
    fontFamily: "'Nunito Variable', 'Nunito', 'Segoe UI', Roboto, Arial, sans-serif",
  },
  components: {
    // El fondo de la página (con lunares) se ve a través del layout; la cara de
    // administración lleva la barra lateral en ciruela en vez del azul de antd.
    Layout: {
      bodyBg: 'transparent',
      headerBg: '#ffffff',
      footerBg: '#ffe9f1',
      siderBg: paleta.ciruela,
      triggerBg: paleta.ciruelaSel,
    },
    Menu: {
      darkItemBg: paleta.ciruela,
      darkSubMenuItemBg: paleta.ciruela,
      darkItemColor: paleta.ciruelaTexto,
      darkItemHoverColor: '#ffffff',
      darkItemSelectedBg: paleta.ciruelaSel,
      darkItemSelectedColor: '#ffffff',
    },
    Button: {
      borderRadius: 20,
      borderRadiusLG: 24,
      borderRadiusSM: 16,
      fontWeight: 700,
      primaryShadow: '0 6px 14px rgba(214, 51, 108, 0.28)',
    },
    Segmented: {
      trackBg: paleta.rosaClaro,
      itemSelectedBg: paleta.primario,
      itemSelectedColor: '#ffffff',
      itemColor: paleta.textoSecundario,
      itemHoverColor: paleta.primarioActivo,
      borderRadius: 999,
      borderRadiusSM: 999,
    },
    Table: {
      headerBg: '#ffeef4',
      headerColor: paleta.texto,
      rowHoverBg: '#fff7fa',
      borderColor: paleta.bordeSuave,
      headerSplitColor: paleta.bordeSuave,
    },
  },
};
