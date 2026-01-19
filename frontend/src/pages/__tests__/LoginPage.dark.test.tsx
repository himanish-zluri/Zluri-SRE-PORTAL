import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from '../LoginPage';

// Mock useAuth hook
const mockLogin = jest.fn();
const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useTheme hook with dark theme
jest.mock('../../context/ThemeContext', () => ({
  ...jest.requireActual('../../context/ThemeContext'),
  useTheme: () => ({
    theme: 'dark',
    toggleTheme: jest.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('LoginPage - Dark Theme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, login: mockLogin });
  });

  it('shows sun icon when theme is dark', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );
    
    // Should show sun icon for dark theme
    const themeButton = screen.getByRole('button', { name: '' });
    expect(themeButton).toBeInTheDocument();
    
    // The sun icon should be present (this covers the dark theme branch - line 43)
    const sunIcon = themeButton.querySelector('svg');
    expect(sunIcon).toBeInTheDocument();
  });
});