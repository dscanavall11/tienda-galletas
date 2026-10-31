// Paleta monocromática estilo "Google Chrome": grises neutros de Material
// Design + un único acento azul (Google Blue) para acciones primarias.
export const themeTokens = {
  token: {
    colorPrimary: '#1a73e8',
    colorInfo: '#1a73e8',
    colorBgLayout: '#f1f3f4',
    colorBgContainer: '#ffffff',
    colorBorder: '#dadce0',
    colorBorderSecondary: '#e8eaed',
    colorText: '#202124',
    colorTextSecondary: '#5f6368',
    colorTextTertiary: '#80868b',
    borderRadius: 8,
    fontFamily: "'Google Sans', Roboto, Arial, sans-serif",
  },
  components: {
    // Cara de administración: barra lateral en gris oscuro (misma familia de
    // grises) en lugar del azul marino por defecto de antd.
    Layout: { siderBg: '#202124', triggerBg: '#3c4043' },
    Menu: {
      darkItemBg: '#202124',
      darkSubMenuItemBg: '#202124',
      darkItemColor: '#bdc1c6',
      darkItemHoverColor: '#ffffff',
      darkItemSelectedBg: '#3c4043',
      darkItemSelectedColor: '#ffffff',
    },
  },
};
