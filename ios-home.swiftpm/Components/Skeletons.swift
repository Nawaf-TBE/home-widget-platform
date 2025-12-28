import SwiftUI

struct SkeletonView: View {
    var body: some View {
        VStack(spacing: 24) {
            // Hero Carousel Skeleton
            VStack(alignment: .leading) {
                HStack {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 120, height: 20)
                    Spacer()
                }
                .padding(.horizontal)
                
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(0..<2) { _ in
                            VStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.gray.opacity(0.3))
                                    .frame(width: 160, height: 120)
                                VStack(alignment: .leading, spacing: 8) {
                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(Color.gray.opacity(0.3))
                                        .frame(width: 100, height: 14)
                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(Color.gray.opacity(0.3))
                                        .frame(width: 60, height: 14)
                                }
                                .padding(10)
                            }
                            .frame(width: 160)
                            .background(Color(white: 0.1))
                            .cornerRadius(12)
                        }
                    }
                    .padding(.horizontal)
                }
            }
            
            // Grid Skeleton
            VStack(alignment: .leading) {
                HStack {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 150, height: 20)
                    Spacer()
                }
                .padding(.horizontal)
                
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach(0..<4) { _ in
                        VStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.gray.opacity(0.3))
                                .frame(height: 100)
                            VStack(alignment: .leading, spacing: 8) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.gray.opacity(0.3))
                                    .frame(width: 80, height: 14)
                            }
                            .padding(10)
                        }
                        .background(Color(white: 0.1))
                        .cornerRadius(12)
                    }
                }
                .padding(.horizontal)
            }
            
            // List Skeleton
            VStack(alignment: .leading) {
                HStack {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 100, height: 20)
                    Spacer()
                }
                .padding(.horizontal)
                
                VStack(spacing: 8) {
                    ForEach(0..<3) { _ in
                        HStack(spacing: 16) {
                            Circle()
                                .fill(Color.gray.opacity(0.3))
                                .frame(width: 56, height: 56)
                            VStack(alignment: .leading, spacing: 8) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.gray.opacity(0.3))
                                    .frame(width: 120, height: 16)
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.gray.opacity(0.3))
                                    .frame(width: 80, height: 12)
                            }
                            Spacer()
                        }
                        .padding(12)
                        .background(Color.white)
                        .cornerRadius(8)
                    }
                }
                .padding(.horizontal)
            }
        }
        .shimmering()
    }
}

// Shimmer extension
extension View {
    func shimmering() -> some View {
        self.modifier(ShimmerEffect())
    }
}

struct ShimmerEffect: ViewModifier {
    @State private var phase: CGFloat = 0
    
    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geo in
                    Color.white.opacity(0.1)
                        .mask(
                            Rectangle()
                                .fill(
                                    LinearGradient(
                                        gradient: Gradient(colors: [.clear, .white.opacity(0.5), .clear]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .rotationEffect(.degrees(30))
                                .offset(x: -geo.size.width + (geo.size.width * 2 * phase))
                        )
                }
            )
            .onAppear {
                withAnimation(Animation.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}
