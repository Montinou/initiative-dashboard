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
  			// SIGA theme colors - Vibrant Green & Action Yellow
  			siga: {
  				green: {
  					DEFAULT: '#00A651',
  					50: '#E8F5F0',
  					100: '#D1EBE1',
  					200: '#A3D7C3',
  					300: '#75C3A5',
  					400: '#47AF87',
  					500: '#00A651',
  					600: '#008541',
  					700: '#006431',
  					800: '#004221',
  					900: '#002110'
  				},
  				yellow: {
  					DEFAULT: '#FDC300',
  					50: '#FFFBF0',
  					100: '#FFF7E0',
  					200: '#FFEFC1',
  					300: '#FFE7A2',
  					400: '#FFDF83',
  					500: '#FDC300',
  					600: '#CA9C00',
  					700: '#977500',
  					800: '#644E00',
  					900: '#322700'
  				},
  				gray: {
  					lightest: '#F8F9FA',
  					medium: '#6C757D',
  					dark: '#212529'
  				}
  			},
  			// FEMA theme colors - Fema Blue & Accent Yellow
  			fema: {
  				blue: {
  					DEFAULT: '#00539F',
  					50: '#E6F2FF',
  					100: '#CCE6FF',
  					200: '#99CCFF',
  					300: '#66B3FF',
  					400: '#3399FF',
  					500: '#00539F',
  					600: '#00427F',
  					700: '#00315F',
  					800: '#002140',
  					900: '#001020'
  				},
  				yellow: {
  					DEFAULT: '#FFC72C',
  					50: '#FFF9E6',
  					100: '#FFF3CC',
  					200: '#FFE799',
  					300: '#FFDB66',
  					400: '#FFCF33',
  					500: '#FFC72C',
  					600: '#CC9F23',
  					700: '#99771A',
  					800: '#665011',
  					900: '#332808'
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
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
