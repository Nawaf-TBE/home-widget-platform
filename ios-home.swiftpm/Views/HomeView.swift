import SwiftUI

struct HomeView: View {
    @StateObject var viewModel: HomeViewModel
    let onLogout: () -> Void
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    if let error = viewModel.errorMessage {
                        VStack {
                            Text(error)
                                .foregroundColor(.red)
                                .padding()
                            Button("Retry") {
                                Task { await viewModel.fetchWidgets() }
                            }
                            .buttonStyle(.borderedProminent)
                        }
                    }
                    
                    if viewModel.widgets.isEmpty && !viewModel.isLoading {
                        Text("No widgets available")
                            .foregroundColor(.secondary)
                            .padding(.top, 50)
                    }
                    
                    ForEach(viewModel.widgets) { widget in
                        SDRenderer(component: widget.content.root)
                    }
                    
                    Divider().padding(.vertical)
                    
                    VStack(spacing: 8) {
                        Button("Check Health") {
                            Task { await viewModel.checkHealth() }
                        }
                        .buttonStyle(.bordered)
                        
                        if let status = viewModel.healthStatus {
                            Text(status)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.bottom)
                }
                .padding()
            }
            .navigationTitle("Home")
            .refreshable {
                await viewModel.fetchWidgets()
            }
            .toolbar {
                #if os(iOS)
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Logout") { onLogout() }
                }
                #else
                ToolbarItem(placement: .automatic) {
                    Button("Logout") { onLogout() }
                }
                #endif
            }
            .overlay {
                if viewModel.isLoading {
                    ProgressView("Tuning your experience...")
                        .padding()
                        .background(.ultraThinMaterial)
                        .cornerRadius(12)
                }
            }
        }
        .task {
            await viewModel.fetchWidgets()
        }
        .preferredColorScheme(.dark)
    }
}
