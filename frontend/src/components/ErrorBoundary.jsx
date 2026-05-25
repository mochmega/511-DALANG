import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Memperbarui state agar render berikutnya menampilkan fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Anda bisa mencatat error ke layanan pelaporan error di sini
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI yang bisa dikustomisasi
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ff4d4f' }}>
          <h2>Oops! Terjadi kesalahan pada antarmuka.</h2>
          <p>Silakan muat ulang halaman atau hubungi administrator.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '8px 16px', marginTop: '1rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #d9d9d9' }}
          >
            Muat Ulang Halaman
          </button>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '2rem', textAlign: 'left', color: '#666' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
