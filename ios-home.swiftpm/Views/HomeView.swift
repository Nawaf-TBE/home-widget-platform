import SwiftUI

struct HomeView: View {
    @StateObject var viewModel: HomeViewModel
    let onLogout: () -> Void
    
    @State private var path = NavigationPath()
    
    var body: some View {
        NavigationStack(path: $path) {
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
                    
                    if let status = viewModel.actionStatus {
                        Text(status)
                            .font(.caption)
                            .foregroundColor(.blue)
                            .padding(.horizontal)
                            .padding(.vertical, 8)
                            .background(Color.blue.opacity(0.15))
                            .cornerRadius(8)
                    }
                    
                    if viewModel.isLoading && viewModel.widgets.isEmpty {
                        SkeletonView()
                            .padding(.top)
                    } else if viewModel.widgets.isEmpty {
                        Text("No widgets available")
                            .foregroundColor(.secondary)
                            .padding(.top, 50)
                    } else {
                        ForEach(viewModel.widgets) { widget in
                            VStack(alignment: .leading, spacing: 4) {
                                // Debug Badge
                                Text("v\(widget.dataVersion ?? 0) • \(widget.servedFrom ?? "?") • \(widget.audienceType):\(widget.audienceId)")
                                    .font(.system(size: 10, design: .monospaced))
                                    .foregroundColor(.secondary)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.black.opacity(0.3))
                                    .cornerRadius(4)
                                
                                SDRenderer(component: widget.content.root) { deeplink in
                                    if let dest = DeeplinkRouter.destination(for: deeplink) {
                                        print("[SDUI] navigating to \(dest) currentPathCount=\(path.count)")
                                        path.append(dest)
                                        print("[SDUI] pathCountAfter=\(path.count)")
                                    } else {
                                        viewModel.actionStatus = "Unsupported: \(deeplink)"
                                        // Clear after 3s
                                        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                                            viewModel.actionStatus = nil
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    Divider().padding(.vertical)
                    
                    // Action Buttons (Hardcoded ones)
                    VStack(spacing: 12) {
                        HStack(spacing: 12) {
                            Button(action: { Task { await viewModel.saveFirstDeal() } }) {
                                Label("Save First Deal", systemImage: "heart.fill")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.green)
                            
                            Button(action: { Task { await viewModel.unsaveLastSaved() } }) {
                                Label("Unsave Last", systemImage: "heart.slash")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.red)
                        }
                        
                        Button(action: { Task { await viewModel.checkHealth() } }) {
                            Label("Check Health", systemImage: "heart.text.square")
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
            .navigationDestination(for: HomeDestination.self) { dest in
                switch dest {
                case .saved:
                    SavedView(jwt: viewModel.jwt)
                case .tariffs:
                    TariffsView()
                }
            }
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
        }
        .task {
            await viewModel.fetchWidgets()
        }
        .preferredColorScheme(.dark)
    }
}
