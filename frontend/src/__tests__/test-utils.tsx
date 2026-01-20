import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ErrorProvider } from '../context/ErrorContext';
import { ThemeProvider } from '../context/ThemeContext';

// Mock the AuthContext for tests
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

interface AllTheProvidersProps {
  children: React.ReactNode;
  initialEntries?: string[];
}

const AllTheProviders = ({ children, initialEntries = ['/'] }: AllTheProvidersProps) => {
  return (
    <ThemeProvider>
      <ErrorProvider>
        <MockAuthProvider>
          <MemoryRouter initialEntries={initialEntries}>
            {children}
          </MemoryRouter>
        </MockAuthProvider>
      </ErrorProvider>
    </ThemeProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
}

const customRender = (
  ui: ReactElement,
  { initialEntries, ...options }: CustomRenderOptions = {}
) =>
  render(ui, {
    wrapper: (props) => <AllTheProviders {...props} initialEntries={initialEntries} />,
    ...options,
  });

export * from '@testing-library/react';
export { customRender as render };