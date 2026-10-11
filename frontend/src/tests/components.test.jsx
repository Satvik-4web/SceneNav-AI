import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MetricsPanel from '../components/MetricsPanel';

describe('MetricsPanel Component', () => {
  it('renders nothing when result is null', () => {
    const { container } = render(<MetricsPanel result={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders success status banner and metrics correctly', () => {
    const mockResult = {
      job_id: 'test-job-999',
      status: 'success',
      reference_keypoints: 3491,
      query_keypoints: 3601,
      tentative_matches: 3601,
      filtered_matches: 1797,
      geometric_inliers: 1759,
      inlier_ratio: 0.979,
      reprojection_error: { mean_px: 0.83, median_px: 0.58, max_px: 3.9 },
      processing_time_s: 0.33,
      algorithm_version: 'ORB-v1',
      software_versions: { opencv: '4.8.0' },
      warnings: [],
    };

    render(<MetricsPanel result={mockResult} />);
    expect(screen.getByText(/Match Successful/i)).toBeDefined();
    expect(screen.getByText('3491')).toBeDefined();
    expect(screen.getByText('1759')).toBeDefined();
  });

  it('renders failure reason when geometry fails', () => {
    const mockFailedResult = {
      job_id: 'failed-job',
      status: 'insufficient_matches',
      failure_reason: 'Only 3 matches remain after filtering.',
      reference_keypoints: 3000,
      query_keypoints: 3000,
      tentative_matches: 100,
      filtered_matches: 3,
      warnings: [],
    };

    render(<MetricsPanel result={mockFailedResult} />);
    expect(screen.getByText(/Insufficient Matches/i)).toBeDefined();
    expect(screen.getByText(/Only 3 matches remain after filtering/i)).toBeDefined();
  });
});
