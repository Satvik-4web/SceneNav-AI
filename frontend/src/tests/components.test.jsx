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

  it('renders localized badge and geographic coordinates when georeferenced', () => {
    const mockLocalizedResult = {
      job_id: 'loc-job-123',
      status: 'success',
      localization_status: 'localized',
      reference_keypoints: 5000,
      query_keypoints: 3000,
      tentative_matches: 800,
      filtered_matches: 800,
      geometric_inliers: 790,
      inlier_ratio: 0.987,
      reprojection_error: { mean_px: 0.81, median_px: 0.6, max_px: 2.1 },
      processing_time_s: 0.22,
      algorithm_version: 'ORB-v1',
      software_versions: { opencv: '4.8.0' },
      warnings: [],
      georeference: {
        is_georeferenced: true,
        crs: 'EPSG:32616',
        crs_epsg: 32616,
        crs_name: 'WGS 84 / UTM zone 16N',
        gsd_x: 1.0,
      },
      geographic_footprint: {
        center: { lat: 33.487987, lon: -84.085158 },
        top_left: { lat: 33.489111, lon: -84.086222 },
        top_right: { lat: 33.489111, lon: -84.084111 },
        bottom_right: { lat: 33.486888, lon: -84.084111 },
        bottom_left: { lat: 33.486888, lon: -84.086222 },
      },
      projected_footprint: {
        center: { x: 770829.6, y: 3709190.5 },
      },
    };

    render(<MetricsPanel result={mockLocalizedResult} />);
    expect(screen.getByText(/LOCALIZED/i)).toBeDefined();
    expect(screen.getByText(/Geographic Footprint/i)).toBeDefined();
    expect(screen.getByText('EPSG:32616')).toBeDefined();
    expect(screen.getByText(/33.487987/)).toBeDefined();
  });
});

