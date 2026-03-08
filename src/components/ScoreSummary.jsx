import { getGrade } from '../App'

export default function ScoreSummary({ totalScore, scoredCount, grade, maxScore = 40 }) {
  const totalItems = maxScore / 5
  const pct = Math.round((totalScore / maxScore) * 100)

  const barColor =
    pct >= 90 ? 'bg-green-500' :
    pct >= 70 ? 'bg-lime-500'  :
    pct >= 50 ? 'bg-amber-400' :
    pct >= 30 ? 'bg-orange-400': 'bg-red-500'

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-end justify-between mb-2">
        <div>
          <span className="text-gray-900 font-black text-3xl tabular-nums">{totalScore}</span>
          <span className="text-gray-400 text-base"> / {maxScore} pts</span>
        </div>

        {grade ? (
          <div className="text-right">
            <div className={`font-black text-4xl leading-none ${grade.color}`}>{grade.letter}</div>
            <div className="text-gray-400 text-xs mt-0.5">{grade.label}</div>
          </div>
        ) : (
          <div className="text-right">
            <div className="text-gray-500 text-sm font-semibold">{totalItems - scoredCount} left</div>
            <div className="text-gray-400 text-xs">to score</div>
          </div>
        )}
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>0</span>
        <span>{maxScore} pts max</span>
      </div>

      {scoredCount > 0 && (
        <p className="text-center text-gray-400 text-xs mt-2">
          Avg {(totalScore / Math.max(scoredCount, 1)).toFixed(1)} / 5.0
          {scoredCount < totalItems && ' (partial)'}
        </p>
      )}
    </div>
  )
}
