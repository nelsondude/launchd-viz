cask "launchd-viz" do
  version "1.0.0"
  sha256 "696601f6d053340886bd4f0040e5dbe55db0035746a198cf09a4d6c46ac4c118"

  url "https://github.com/nelsondude/launchd-viz/releases/download/v#{version}/Launchd.Viz-#{version}-universal.dmg"
  name "Launchd Viz"
  desc "macOS Launch Agent & Daemon Manager"
  homepage "https://github.com/nelsondude/launchd-viz"

  depends_on macos: ">= :catalina"

  app "Launchd Viz.app"

  caveats <<~EOS
    #{token} is not signed. On first launch you may need to:
      Right-click the app > Open, or run:
      xattr -cr /Applications/Launchd\\ Viz.app
  EOS

  zap trash: [
    "~/Library/Application Support/launchd-viz",
    "~/Library/Preferences/com.nelsondude.launchd-viz.plist",
  ]
end
