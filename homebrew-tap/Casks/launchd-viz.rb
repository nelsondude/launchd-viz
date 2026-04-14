cask "launchd-viz" do
  version "1.0.0"
  sha256 "REPLACE_WITH_ACTUAL_SHA256"

  url "https://github.com/nelsondude/launchd-viz/releases/download/v#{version}/Launchd%20Viz-#{version}-universal.dmg"
  name "Launchd Viz"
  desc "macOS Launch Agent & Daemon Manager"
  homepage "https://github.com/nelsondude/launchd-viz"

  depends_on macos: ">= :catalina"

  app "Launchd Viz.app"

  zap trash: [
    "~/Library/Application Support/launchd-viz",
    "~/Library/Preferences/com.nelsondude.launchd-viz.plist",
  ]
end
