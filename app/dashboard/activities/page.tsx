"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ActivitiesTestPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Activities Test Page</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is a simple test page to check if the route works.</p>
        </CardContent>
      </Card>
    </div>
  )
}