:root {
  /* Backgrounds principales */
  --background: #FFFFFF;
  --foreground: #0A0A0A;
  
  /* Cards y superficies */
  --card: #FFFFFF;
  --card-foreground: #0A0A0A;
  
  /* Popovers y modales */
  --popover: #FFFFFF;
  --popover-foreground: #0A0A0A;
  
  /* Color primario - Verde Siga */
  --primary: #00B74A;
  --primary-foreground: #FFFFFF;
  
  /* Color secundario - Gris perla */
  --secondary: #F8F9FA;
  --secondary-foreground: #1F2937;
  
  /* Muted - Para textos secundarios */
  --muted: #F3F4F6;
  --muted-foreground: #6B7280;
  
  /* Accent - Amarillo Siga */
  --accent: #FFC107;
  --accent-foreground: #171717;
  
  /* Destructive - Acciones peligrosas */
  --destructive: #EF4444;
  --destructive-foreground: #FFFFFF;
  
  /* Bordes e inputs */
  --border: #E5E7EB;
  --input: #E5E7EB;
  --ring: #00B74A;
  
  /* Radio de bordes */
  --radius: 0.5rem;
}






/* Estados y variantes */
:root {
  /* Verde Siga - variantes */
  --primary-hover: #00A03F;     /* Más oscuro para hover */
  --primary-light: #E6F7ED;     /* Fondo suave verde */
  --primary-border: #00D355;    /* Borde más claro */
  
  /* Amarillo Siga - variantes */
  --accent-hover: #FFB300;      /* Más intenso para hover */
  --accent-light: #FFF8E1;      /* Fondo suave amarillo */
  --accent-border: #FFD54F;     /* Borde más claro */
  
  /* Grises neutros */
  --gray-50: #F8F9FA;   /* Gris perla base */
  --gray-100: #F3F4F6;
  --gray-200: #E5E7EB;
  --gray-300: #D1D5DB;
  --gray-400: #9CA3AF;
  --gray-500: #6B7280;
  --gray-600: #4B5563;
  --gray-700: #374151;
  --gray-800: #1F2937;
  --gray-900: #111827;
  
  /* Estados de éxito/error/advertencia */
  --success: #00B74A;           /* Verde Siga */
  --success-light: #E6F7ED;
  --warning: #FFC107;           /* Amarillo Siga */
  --warning-light: #FFF8E1;
  --error: #EF4444;
  --error-light: #FEE2E2;
  --info: #3B82F6;
  --info-light: #EFF6FF;
}









.dark {
  /* Backgrounds principales */
  --background: #0A0A0A;
  --foreground: #F8F9FA;
  
  /* Cards y superficies elevadas */
  --card: #141414;
  --card-foreground: #F8F9FA;
  
  /* Popovers y modales */
  --popover: #1A1A1A;
  --popover-foreground: #F8F9FA;
  
  /* Color primario - Verde Siga (ajustado para dark) */
  --primary: #00D955;
  --primary-foreground: #0A0A0A;
  
  /* Color secundario - Gris oscuro */
  --secondary: #1F1F1F;
  --secondary-foreground: #F8F9FA;
  
  /* Muted - Para textos secundarios */
  --muted: #262626;
  --muted-foreground: #A1A1AA;
  
  /* Accent - Amarillo Siga (ajustado para dark) */
  --accent: #FFCA28;
  --accent-foreground: #0A0A0A;
  
  /* Destructive - Acciones peligrosas */
  --destructive: #DC2626;
  --destructive-foreground: #FFFFFF;
  
  /* Bordes e inputs */
  --border: #2A2A2A;
  --input: #2A2A2A;
  --ring: #00D955;
  
  /* Radio de bordes */
  --radius: 0.5rem;
}

.dark {
  /* Verde Siga Dark - variantes */
  --primary-hover: #00FF63;     /* Más brillante para hover */
  --primary-dark: #001F0C;      /* Fondo muy suave verde */
  --primary-border: #00B74A;    /* Borde original */
  
  /* Amarillo Siga Dark - variantes */
  --accent-hover: #FFD54F;      /* Más brillante para hover */
  --accent-dark: #1F1A00;       /* Fondo muy suave amarillo */
  --accent-border: #FFC107;     /* Borde original */
  
  /* Escala de grises oscuros */
  --gray-950: #0A0A0A;   /* Fondo principal */
  --gray-900: #111111;
  --gray-850: #141414;   /* Cards */
  --gray-800: #1A1A1A;
  --gray-750: #1F1F1F;   /* Secondary */
  --gray-700: #262626;   /* Muted */
  --gray-600: #2A2A2A;   /* Borders */
  --gray-500: #404040;
  --gray-400: #525252;
  --gray-300: #6B6B6B;
  --gray-200: #A1A1AA;   /* Texto secundario */
  --gray-100: #D4D4D8;   /* Texto terciario */
  --gray-50: #F8F9FA;    /* Texto principal */
  
  /* Estados de éxito/error/advertencia dark */
  --success: #00D955;           /* Verde más brillante */
  --success-dark: #001F0C;
  --warning: #FFCA28;           /* Amarillo ajustado */
  --warning-dark: #1F1A00;
  --error: #DC2626;
  --error-dark: #1F0808;
  --info: #60A5FA;
  --info-dark: #0C1729;
}


// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#00B74A",
          foreground: "#FFFFFF",
          50: "#E6F7ED",
          100: "#C2F0D4",
          200: "#85E1A8",
          300: "#47D17D",
          400: "#0AC251",
          500: "#00B74A",
          600: "#00A03F",
          700: "#007A30",
          800: "#005421",
          900: "#002E12",
        },
        secondary: {
          DEFAULT: "#F8F9FA",
          foreground: "#1F2937",
        },
        accent: {
          DEFAULT: "#FFC107",
          foreground: "#171717",
          50: "#FFF8E1",
          100: "#FFECB3",
          200: "#FFE082",
          300: "#FFD54F",
          400: "#FFCA28",
          500: "#FFC107",
          600: "#FFB300",
          700: "#FFA000",
          800: "#FF8F00",
          900: "#FF6F00",
        },
        muted: {
          DEFAULT: "#F3F4F6",
          foreground: "#6B7280",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
      },
    },
  },
}



// Button variants
<Button variant="default">      // Verde Siga
<Button variant="secondary">    // Gris perla
<Button variant="outline">      // Borde gris
<Button variant="destructive">  // Rojo error
<Button variant="ghost">        // Transparente con hover gris

// Alert variants con colores Siga
<Alert className="border-green-500 bg-green-50">
<Alert className="border-yellow-500 bg-yellow-50">

// Card con fondo gris perla
<Card className="bg-gray-50">

// Badge con colores corporativos
<Badge className="bg-green-500 text-white">
<Badge className="bg-yellow-500 text-gray-900">