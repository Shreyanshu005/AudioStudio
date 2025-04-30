import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ReplayInsightsProps {
  playbackData: number[];
  duration: number;
  mostReplayedSegment: {
    index: number;
    count: number;
  } | null;
}

const ReplayInsights = ({ playbackData, duration, mostReplayedSegment }: ReplayInsightsProps) => {
  if (!playbackData.length || duration === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listener Insights</CardTitle>
          <CardDescription>
            Play your audio to see listener engagement data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Insights will appear here as you listen to your audio. Try replaying sections to see the data change.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Format time in MM:SS format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format data for recharts
  const chartData = playbackData.map((count, index) => {
    const segmentDuration = duration / playbackData.length;
    const startTime = index * segmentDuration;
    const endTime = (index + 1) * segmentDuration;
    
    return {
      segment: `${formatTime(startTime)}-${formatTime(endTime)}`,
      plays: count,
      isHighest: mostReplayedSegment?.index === index
    };
  });

  // Get most replayed segment info
  const getMostReplayedInfo = () => {
    if (!mostReplayedSegment) return null;
    
    const segmentDuration = duration / playbackData.length;
    const startTime = mostReplayedSegment.index * segmentDuration;
    const endTime = (mostReplayedSegment.index + 1) * segmentDuration;
    
    return {
      index: mostReplayedSegment.index,
      count: mostReplayedSegment.count,
      start: formatTime(startTime),
      end: formatTime(endTime)
    };
  };

  const mostReplayedInfo = getMostReplayedInfo();

  // Get total playback count
  const totalPlays = playbackData.reduce((sum, count) => sum + count, 0);

  // Format number with decimal points
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Listener Insights
          <Badge variant="outline" className="ml-2">Live</Badge>
        </CardTitle>
        <CardDescription>
          See which parts of your audio are replayed most often
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-sm font-medium text-muted-foreground">Total Replays</div>
            <div className="text-2xl font-bold overflow-hidden text-ellipsis">{formatNumber(totalPlays)}</div>
          </div>
          
          {mostReplayedInfo && (
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Most Replayed</div>
              <div className="text-2xl font-bold overflow-hidden text-ellipsis">{formatNumber(mostReplayedInfo.count)}x</div>
              <div className="text-xs text-muted-foreground mt-1">
                {mostReplayedInfo.start} - {mostReplayedInfo.end}
              </div>
            </div>
          )}
        </div>
        
        {/* Chart */}
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="segment" 
                tick={{ fontSize: 10 }} 
                interval={Math.ceil(chartData.length / 5)}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip 
                formatter={(value, name) => [`${value} plays`, 'Segment']}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Bar 
                dataKey="plays" 
                fill="#9b87f5" 
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <p className="text-xs text-muted-foreground">
          This visualization shows how many times each segment of your audio was replayed. Higher bars indicate more replays.
        </p>
      </CardContent>
    </Card>
  );
};

export default ReplayInsights;
