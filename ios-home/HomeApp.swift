import SwiftUI

struct RootView: View {
    @State private var jwt: String? = nil
    
    var body: some View {
        if let jwt = jwt {
            HomeView(viewModel: HomeViewModel(jwt: jwt), onLogout: {
                self.jwt = nil
            })
        } else {
            LoginView(onLogin: { jwt in
                self.jwt = jwt
            })
        }
    }
}

@main
struct HomeApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}
