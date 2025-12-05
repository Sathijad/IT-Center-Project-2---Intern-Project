import React from 'react'
import { NlpAnalysis } from '../../lib/feedbackApi'
import { Brain, AlertTriangle } from 'lucide-react'

interface FeedbackAnalyticsProps {
  analysis: NlpAnalysis
}

const FeedbackAnalytics: React.FC<FeedbackAnalyticsProps> = ({ analysis }) => {
  const sentimentColors: Record<string, string> = {
    POSITIVE: 'text-green-600',
    NEGATIVE: 'text-red-600',
    NEUTRAL: 'text-gray-600',
    MIXED: 'text-yellow-600',
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-600" />
        <h2 className="text-xl font-semibold">Sentiment Analysis</h2>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Overall Sentiment</p>
          <p className={`text-lg font-semibold ${sentimentColors[analysis.sentiment || 'NEUTRAL']}`}>
            {analysis.sentiment || 'N/A'}
          </p>
        </div>

        {analysis.sentiment_score && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Sentiment Scores</p>
            <div className="space-y-2">
              {Object.entries(analysis.sentiment_score).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 capitalize">{key}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(value as number) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {((value as number) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.pii_entities && analysis.pii_entities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <p className="text-sm font-medium text-gray-700">PII Detected</p>
            </div>
            <div className="space-y-1">
              {analysis.pii_entities.map((entity, index) => (
                <div key={index} className="text-sm text-gray-600">
                  <span className="font-medium">{entity.type}:</span> {entity.text} (Score: {(entity.score * 100).toFixed(1)}%)
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t">
          Analyzed at: {new Date(analysis.analyzed_at).toLocaleString()}
        </div>
      </div>
    </div>
  )
}

export default FeedbackAnalytics

