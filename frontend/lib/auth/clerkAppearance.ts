export const clerkAppearance = {
  variables: {
    colorPrimary: '#0d9488',
    colorBackground: '#ffffff',
    colorText: '#151b26',
    colorTextSecondary: '#4d5668',
    colorInputText: '#151b26',
    colorInputBackground: '#ffffff',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: '0.5rem',
  },
  elements: {
    card: {
      boxShadow: '0 12px 32px -4px rgb(0 0 0 / 0.08)',
      border: '1px solid #e3e7ef',
    },
    formButtonPrimary: {
      backgroundColor: '#0d9488',
      '&:hover': {
        backgroundColor: '#0c7a71',
      },
    },
  },
};