import { Timer } from '@ark-ui/react/timer';
import { Clock, Pause, Play, RotateCcw } from 'lucide-react';

export default function TimerBasic() {
  return (
    <div className="w-full rounded-xl bg-white px-4 py-6">
      <Timer.Root targetMs={90 * 60 * 1000} className="w-full">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-600" />
            <h3 className="text-sm font-semibold text-gray-900">Exam Timer</h3>
          </div>

          <Timer.Area className="mb-5 flex items-center justify-center gap-1">
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
              <Timer.Item type="hours" className="min-w-[2ch] text-center font-mono text-xl text-gray-900" />
            </div>
            <Timer.Separator className="mx-1 text-gray-400">:</Timer.Separator>
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
              <Timer.Item type="minutes" className="min-w-[2ch] text-center font-mono text-xl text-gray-900" />
            </div>
            <Timer.Separator className="mx-1 text-gray-400">:</Timer.Separator>
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
              <Timer.Item type="seconds" className="min-w-[2ch] text-center font-mono text-xl text-gray-900" />
            </div>
          </Timer.Area>

          <Timer.Control className="flex gap-2">
            <Timer.ActionTrigger
              action="start"
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-teal-600 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              <Play className="h-4 w-4" />
              Start
            </Timer.ActionTrigger>
            <Timer.ActionTrigger
              action="pause"
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-gray-200 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
            >
              <Pause className="h-4 w-4" />
              Pause
            </Timer.ActionTrigger>
            <Timer.ActionTrigger
              action="reset"
              className="flex items-center justify-center rounded-md bg-gray-200 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-300"
            >
              <RotateCcw className="h-4 w-4" />
            </Timer.ActionTrigger>
          </Timer.Control>
        </div>
      </Timer.Root>
    </div>
  );
}
