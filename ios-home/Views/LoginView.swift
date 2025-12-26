import SwiftUI

struct LoginView: View {
    @StateObject var viewModel = LoginViewModel()
    let onLogin: (String) -> Void
    
    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "house.fill")
                .font(.system(size: 80))
                .foregroundColor(.blue)
            
            Text("Home Widget Platform")
                .font(.title)
                .bold()
            
            VStack(alignment: .leading, spacing: 10) {
                Text("User ID")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                TextField("Enter User ID", text: $viewModel.userId)
                    .padding()
                    .background(Color(white: 0.1))
                    .cornerRadius(12)
                    .autocapitalization(.none)
            }
            .padding(.horizontal)
            
            if let error = viewModel.error {
                Text(error)
                    .foregroundColor(.red)
                    .font(.caption)
                    .multilineTextAlignment(.center)
            }
            
            Button(action: {
                Task {
                    await viewModel.login()
                    if let jwt = viewModel.jwt {
                        onLogin(jwt)
                    }
                }
            }) {
                HStack {
                    if viewModel.isLoading {
                        ProgressView().tint(.white)
                    } else {
                        Text("Sign In")
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .padding(.horizontal)
            .disabled(viewModel.isLoading || viewModel.userId.isEmpty)
        }
        .preferredColorScheme(.dark)
    }
}
