import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import { KubernetesClusterPicker } from './KubernetesClusterPicker';
import {useApi} from "@backstage/core-plugin-api";
import {useTemplateSecrets} from "@backstage/plugin-scaffolder-react";

jest.mock('@backstage/plugin-kubernetes', () => ({
  kubernetesApiRef: {},
  kubernetesAuthProvidersApiRef: {},
}));

jest.mock('@backstage/core-plugin-api')
jest.mock('@backstage/plugin-scaffolder-react')


describe('KubernetesClusterPicker', () => {
  const mockUseApi = useApi as jest.MockedFunction<typeof useApi>;
  const mockGetClusters = jest.fn()
  const mockGetCredentials = jest.fn()
  const mockUseTemplateSecrets = useTemplateSecrets as jest.MockedFunction<typeof useTemplateSecrets>;
  const mockSetSecrets = jest.fn()

  const onChange = jest.fn();
  const mockClusters = [
    { name: 'cluster-1', authProvider: 'auth-1', oidcTokenProvider: "oidc1" },
    { name: 'cluster-2', authProvider: 'auth-2', oidcTokenProvider: "oidc2" },
  ];

  beforeEach(() => {
    mockUseApi.mockReturnValue({
      getClusters: mockGetClusters,
      getCredentials: mockGetCredentials
    })
    mockUseTemplateSecrets.mockReturnValue({
      setSecrets: mockSetSecrets,
      secrets: {}
    })
  })

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders clusters in Select component after loading', async () => {
    mockGetClusters.mockImplementationOnce(() => mockClusters)
    // @ts-ignore
    render(<KubernetesClusterPicker uiSchema={{}} onChange={onChange} />);

    await waitFor(() => {
      const clusterSelect = screen.getByLabelText('Cluster').querySelector('select');
      expect(clusterSelect).toBeInTheDocument();
      expect(screen.getByText('Kubernetes Cluster Name')).toBeInTheDocument();
      expect(clusterSelect!.children).toHaveLength(2);
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('cluster-1')
  });

  it('calls onChange with selected cluster when a cluster is selected', async () => {
    mockGetClusters.mockImplementationOnce(() => mockClusters)

    // @ts-ignore
    render(<KubernetesClusterPicker uiSchema={{}} onChange={onChange} />);

    await waitFor(() => {
      const clusterSelect = screen.getByLabelText('Cluster').querySelector('select');
      fireEvent.change(clusterSelect!, { target: { value: 'cluster-2' } });
      expect(onChange).toHaveBeenCalledWith('cluster-2');
    })
  });

  it('gets credentials when secret key is defined', async () => {
    mockGetClusters.mockResolvedValue(mockClusters)
    mockGetCredentials.mockResolvedValue({
      token: "returned-token"
    })

    const uiSchema = {
      ['ui:options']: {
        requestUserCredentials: {
          secretKey: "MY-KEY"
        }
      }
    }
    // @ts-ignore
    render(<KubernetesClusterPicker uiSchema={uiSchema} onChange={onChange} />);

    await waitFor(() => {
      expect(mockGetClusters).toHaveBeenCalledTimes(2)
      expect(mockSetSecrets).toHaveBeenCalledWith({['MY-KEY']: 'returned-token'})
    })
  });

  it('returns allowed hosts only', async () => {
    mockGetClusters.mockResolvedValue(mockClusters)
    const uiSchema = {
      ['ui:options']: {
        allowedClusters: [
          'cluster-2'
        ]
      }
    }
    // @ts-ignore
    render(<KubernetesClusterPicker uiSchema={uiSchema} onChange={onChange} />);

    await waitFor(() => {
      const clusterSelect = screen.getByLabelText('Cluster').querySelector('select');
      expect(clusterSelect!.children).toHaveLength(1)
    })
  });
});
