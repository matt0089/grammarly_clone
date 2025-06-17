import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ReadabilityResult } from "@/lib/readability"

interface ReadabilityDisplayProps {
  result: ReadabilityResult | null
  wordCount: number
}

export function ReadabilityDisplay({ result, wordCount }: ReadabilityDisplayProps) {
  if (!result) {
    if (wordCount < 30) {
      return (
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Readability</span>
          <span className="text-sm text-gray-400">Need 30+ words</span>
        </div>
      )
    }
    return null
  }

  const getColorClasses = (color: ReadabilityResult["color"]) => {
    switch (color) {
      case "green":
        return "bg-green-100 text-green-800 border-green-200"
      case "yellow":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "red":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">Readability</span>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={`text-xs cursor-help ${getColorClasses(result.color)}`}>
                {result.score}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{result.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
