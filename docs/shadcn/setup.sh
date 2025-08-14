#!/bin/bash

# Instalar shadcn/ui
npx shadcn-ui@latest init

# Instalar componentes necesarios
npx shadcn-ui@latest add card
npx shadcn-ui@latest add button  
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add select
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add skeleton

echo "✅ shadcn/ui components installed"