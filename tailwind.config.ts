import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			siga: {
  				green: {
  					'50': '#E6F7ED',
  					'100': '#C2F0D4',
  					'200': '#85E1A8',
  					'300': '#47D17D',
  					'400': '#0AC251',
  					'500': '#00B74A',  // Verde exacto SIGA
  					'600': '#00A03F',
  					'700': '#007A30',
  					'800': '#005421',
  					'900': '#002E12',
  					'950': '#001F0C',
  					DEFAULT: '#00B74A',
  					dark: '#00D955',     // Verde ajustado para dark mode
  					'dark-hover': '#00FF63',
  					'dark-muted': '#001F0C'
  				},
  				yellow: {
  					'50': '#FFF8E1',
  					'100': '#FFECB3',
  					'200': '#FFE082',
  					'300': '#FFD54F',
  					'400': '#FFCA28',
  					'500': '#FFC107',  // Amarillo exacto SIGA
  					'600': '#FFB300',
  					'700': '#FFA000',
  					'800': '#FF8F00',
  					'900': '#FF6F00',
  					DEFAULT: '#FFC107',
  					dark: '#FFCA28',     // Amarillo ajustado para dark mode
  					'dark-hover': '#FFD54F',
  					'dark-muted': '#1F1A00'
  				},
  				gray: {
  					'50': '#F8F9FA',   // Gris perla
  					'100': '#F3F4F6',
  					'200': '#E5E7EB',
  					'300': '#D1D5DB',
  					'400': '#9CA3AF',
  					'500': '#6B7280',
  					'600': '#4B5563',
  					'700': '#374151',
  					'800': '#1F2937',
  					'900': '#111827',
  					'950': '#0A0A0A',
  					lightest: '#F8F9FA',
  					medium: '#6C757D',
  					dark: '#212529'
  				},
  				// Dark mode specific colors
  				dark: {
  					bg: '#0A0A0A',
  					card: '#141414',
  					elevated: '#1A1A1A',
  					muted: '#1F1F1F',
  					subtle: '#262626',
  					border: '#2A2A2A'
  				}
  			},
  			fema: {
  				blue: {
  					'50': '#E6F2FF',
  					'100': '#CCE6FF',
  					'200': '#99CCFF',
  					'300': '#66B3FF',
  					'400': '#3399FF',
  					'500': '#00539F',
  					'600': '#00427F',
  					'700': '#00315F',
  					'800': '#002140',
  					'900': '#001020',
  					DEFAULT: '#00539F'
  				},
  				yellow: {
  					'50': '#FFF9E6',
  					'100': '#FFF3CC',
  					'200': '#FFE799',
  					'300': '#FFDB66',
  					'400': '#FFCF33',
  					'500': '#FFC72C',
  					'600': '#CC9F23',
  					'700': '#99771A',
  					'800': '#665011',
  					'900': '#332808',
  					DEFAULT: '#FFC72C'
  				},
  				gray: {
  					lightest: '#F0F2F5',
  					medium: '#6C757D',
  					dark: '#212529'
  				}
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
  		screens: {
  			'2xl': '1536px',
  			'3xl': '1920px',
  			'4xl': '2560px'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
  safelist: [
    // FEMA theme classes
    'text-fema-blue',
    'text-fema-yellow',
    'bg-fema-blue',
    'bg-fema-yellow',
    'bg-fema-blue/10',
    'bg-fema-blue/20',
    'bg-fema-yellow/10',
    'bg-fema-yellow/20',
    'border-fema-blue',
    'border-fema-yellow',
    'border-fema-blue/10',
    'border-fema-blue/20',
    'border-fema-blue/30',
    'border-fema-blue/50',
    'from-fema-blue',
    'to-fema-blue',
    'via-fema-blue',
    'hover:bg-fema-blue/10',
    'hover:bg-fema-blue/20',
    'hover:border-fema-blue',
    'hover:border-fema-blue/50',
    
    // SIGA theme classes - expanded
    'text-siga-green',
    'text-siga-green-500',
    'text-siga-green-600',
    'text-siga-green-dark',
    'text-siga-yellow',
    'text-siga-yellow-500',
    'text-siga-yellow-dark',
    'bg-siga-green',
    'bg-siga-green-50',
    'bg-siga-green-500',
    'bg-siga-green-600',
    'bg-siga-green-dark',
    'bg-siga-yellow',
    'bg-siga-yellow-50',
    'bg-siga-yellow-500',
    'bg-siga-yellow-dark',
    'bg-siga-gray-50',
    'bg-siga-gray-100',
    'bg-siga-dark-bg',
    'bg-siga-dark-card',
    'bg-siga-dark-elevated',
    'bg-siga-green/5',
    'bg-siga-green/10',
    'bg-siga-green/20',
    'bg-siga-yellow/10',
    'bg-siga-yellow/20',
    'border-siga-green',
    'border-siga-green-500',
    'border-siga-green-dark',
    'border-siga-yellow',
    'border-siga-yellow-500',
    'border-siga-dark-border',
    'border-siga-green/10',
    'border-siga-green/20',
    'border-siga-green/30',
    'border-siga-green/50',
    'from-siga-green',
    'to-siga-green',
    'to-siga-green/80',
    'via-siga-green',
    'hover:bg-siga-green/5',
    'hover:bg-siga-green/10',
    'hover:bg-siga-green/20',
    'hover:bg-siga-green-600',
    'hover:bg-siga-green-dark-hover',
    'hover:bg-siga-yellow-600',
    'hover:bg-siga-yellow-dark-hover',
    'hover:border-siga-green',
    'hover:border-siga-green/50',
    'dark:bg-siga-dark-bg',
    'dark:bg-siga-dark-card',
    'dark:bg-siga-dark-elevated',
    'dark:bg-siga-green-dark',
    'dark:bg-siga-yellow-dark',
    'dark:text-siga-green-dark',
    'dark:text-siga-yellow-dark',
    'dark:border-siga-dark-border',
    
    // Opacity variants
    'text-fema-yellow/80',
    'text-siga-yellow/80',
    
    // Scale and focus states
    'scale-105',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'focus:ring-fema-blue',
    'focus:ring-siga-green',
    'focus:ring-siga-green-500',
    'focus:ring-siga-green-dark',
  ],
};
export default config;