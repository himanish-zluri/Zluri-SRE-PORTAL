import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProcessingProvider, useProcessing } from '../ProcessingContext';

// Test component that uses the processing context
const TestComponent = () => {
  const { 
    processingQueries, 
    addProcessingQuery, 
    removeProcessingQuery, 
    isQueryProcessing, 
    clearAllProcessing 
  } = useProcessing();

  return (
    <div>
      <div data-testid="processing-count">{processingQueries.size}</div>
      <div data-testid="query-1-processing">{isQueryProcessing('query-1').toString()}</div>
      <div data-testid="query-2-processing">{isQueryProcessing('query-2').toString()}</div>
      
      <button onClick={() => addProcessingQuery('query-1')}>
        Add Query 1
      </button>
      <button onClick={() => addProcessingQuery('query-2')}>
        Add Query 2
      </button>
      <button onClick={() => removeProcessingQuery('query-1')}>
        Remove Query 1
      </button>
      <button onClick={() => removeProcessingQuery('query-2')}>
        Remove Query 2
      </button>
      <button onClick={clearAllProcessing}>
        Clear All
      </button>
    </div>
  );
};

// Component that tries to use useProcessing outside of provider
const ComponentWithoutProvider = () => {
  const { addProcessingQuery } = useProcessing();
  return <div>Should not render</div>;
};

describe('ProcessingContext', () => {
  it('provides processing context to children', () => {
    render(
      <ProcessingProvider>
        <TestComponent />
      </ProcessingProvider>
    );

    expect(screen.getByTestId('processing-count')).toHaveTextContent('0');
    expect(screen.getByTestId('query-1-processing')).toHaveTextContent('false');
    expect(screen.getByTestId('query-2-processing')).toHaveTextContent('false');
  });

  it('throws error when useProcessing is used outside of provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<ComponentWithoutProvider />);
    }).toThrow('useProcessing must be used within a ProcessingProvider');

    console.error = originalError;
  });

  it('adds processing queries correctly', () => {
    render(
      <ProcessingProvider>
        <TestComponent />
      </ProcessingProvider>
    );

    // Initially no queries processing
    expect(screen.getByTestId('processing-count')).toHaveTextContent('0');
    expect(screen.getByTestId('query-1-processing')).toHaveTextContent('false');

    // Add query-1
    fireEvent.click(screen.getByText('Add Query 1'));

    expect(screen.getByTestId('processing-count')).toHaveTextContent('1');
    expect(screen.getByTestId('query-1-processing')).toHaveTextContent('true');
    expect(screen.getByTestId('query-2-processing')).toHaveTextContent('false');
  });

  it('adds multiple processing queries correctly', () => {
    render(
      <ProcessingProvider>
        <TestComponent />
      </ProcessingProvider>
    );

    // Add both queries
    fireEvent.click(screen.getByText('Add Query 1'));
    fireEvent.click(screen.getByText('Add Query 2'));

    expect(screen.getByTestId('processing-count')).toHaveTextContent('2');
    expect(screen.getByTestId('query-1-processing')).toHaveTextContent('true');
    expect(screen.getByTestId('query-2-processing')).toHaveTextContent('true');
  });

  it('handles adding the same query multiple times (should not duplicate)', () => {
    render(
      <ProcessingProvider>
        <TestComponent />
      </ProcessingProvider>
    );

    // Add query-1 multiple times
    fireEvent.click(screen.getByText('Add Query 1'));
    fireEvent.click(screen.getByText('Add Query 1'));
    fireEvent.click(screen.getByText('Add Query 1'));

    // Should still only have 1 query in the set
    expect(screen.getByTestId('processing-count')).toHaveTextContent('1');
    expect(screen.getByTestId('query-1-processing')).toHaveTextContent('true');
  });

  it('removes processing queries correctly', () => {
    render(
      <ProcessingProvider>
        <TestComponent />
      </ProcessingProvider>
    );

    // Add both queries
    fireEvent.click(screen.getByText('Add Query 1'));
    fireEvent.click(screen.getByText('Add Query 2'));

    expect(screen.getByTestId('processing-count')).toHaveTextContent('2');

    // Remove query-1
    fireEvent.click(screen.getByText('Remove Query 1'));

    expect(screen.getByTestId('processing-count')).toHaveTextContent('1');
    expect(screen.getByTestId('query-1-processing')).toHaveTextContent('false');
    expect(screen.getByTestId('query-2-processing')).toHaveTextContent('true');
  });

  it('handles removing non-existent queries gracefully', () => {
    render(
      <ProcessingProvider>
        <TestComponent />
      </ProcessingProvider>
    );

    // Try to remove a query that was never added
    fireEvent.click(screen.getByText('Remove Query 1'));

    expect(screen.getByTestId('processing-count')).toHaveTextContent('0');
    expect(screen.getByTestId('query-1-processing')).toHaveTextContent('false');
  });

  it('clears all processing queries', () => {
    render(
      <ProcessingProvider>
        <TestComponent />
      </ProcessingProvider>
    );

    // Add multiple queries
    fireEvent.click(screen.getByText('Add Query 1'));
    fireEvent.click(screen.getByText('Add Query 2'));

    expect(screen.getByTestId('processing-count')).toHaveTextContent('2');

    // Clear all
    fireEvent.click(screen.getByText('Clear All'));

    expect(screen.getByTestId('processing-count')).toHaveTextContent('0');
    expect(screen.getByTestId('query-1-processing')).toHaveTextContent('false');
    expect(screen.getByTestId('query-2-processing')).toHaveTextContent('false');
  });

  it('clears all when no queries are processing', () => {
    render(
      <ProcessingProvider>
        <TestComponent />
      </ProcessingProvider>
    );

    // Clear all when nothing is processing (should not crash)
    fireEvent.click(screen.getByText('Clear All'));

    expect(screen.getByTestId('processing-count')).toHaveTextContent('0');
  });

  it('isQueryProcessing returns correct boolean values', () => {
    render(
      <ProcessingProvider>
        <TestComponent />
      </ProcessingProvider>
    );

    // Initially false
    expect(screen.getByTestId('query-1-processing')).toHaveTextContent('false');

    // Add query and check it's true
    fireEvent.click(screen.getByText('Add Query 1'));
    expect(screen.getByTestId('query-1-processing')).toHaveTextContent('true');

    // Remove query and check it's false again
    fireEvent.click(screen.getByText('Remove Query 1'));
    expect(screen.getByTestId('query-1-processing')).toHaveTextContent('false');
  });

  it('maintains separate state for different queries', () => {
    render(
      <ProcessingProvider>
        <TestComponent />
      </ProcessingProvider>
    );

    // Add only query-1
    fireEvent.click(screen.getByText('Add Query 1'));

    expect(screen.getByTestId('query-1-processing')).toHaveTextContent('true');
    expect(screen.getByTestId('query-2-processing')).toHaveTextContent('false');

    // Add query-2
    fireEvent.click(screen.getByText('Add Query 2'));

    expect(screen.getByTestId('query-1-processing')).toHaveTextContent('true');
    expect(screen.getByTestId('query-2-processing')).toHaveTextContent('true');

    // Remove only query-1
    fireEvent.click(screen.getByText('Remove Query 1'));

    expect(screen.getByTestId('query-1-processing')).toHaveTextContent('false');
    expect(screen.getByTestId('query-2-processing')).toHaveTextContent('true');
  });

  it('exposes processingQueries Set correctly', () => {
    const TestSetComponent = () => {
      const { processingQueries, addProcessingQuery } = useProcessing();
      
      return (
        <div>
          <div data-testid="set-size">{processingQueries.size}</div>
          <div data-testid="has-query-1">{processingQueries.has('query-1').toString()}</div>
          <button onClick={() => addProcessingQuery('query-1')}>Add Query 1</button>
        </div>
      );
    };

    render(
      <ProcessingProvider>
        <TestSetComponent />
      </ProcessingProvider>
    );

    expect(screen.getByTestId('set-size')).toHaveTextContent('0');
    expect(screen.getByTestId('has-query-1')).toHaveTextContent('false');

    fireEvent.click(screen.getByText('Add Query 1'));

    expect(screen.getByTestId('set-size')).toHaveTextContent('1');
    expect(screen.getByTestId('has-query-1')).toHaveTextContent('true');
  });
});