import Foundation
import AVFoundation


class PluginImgRenderer : NSObject {
    var webView: UIView
    var eventListener: (_ data: NSDictionary) -> Void
    var elementView: UIView
    var imgView: UIImageView
    var image: UIImage?


    init(
        webView: UIView,
        eventListener: @escaping (_ data: NSDictionary) -> Void
        ) {
        NSLog("PluginImgRenderer#init()")

        // The browser HTML view.
        self.webView = webView
        self.eventListener = eventListener
        // The video element view.
        self.elementView = UIView()
        // The effective video view in which the the video stream is shown.
        // It's placed over the elementView.
        self.imgView = UIImageView()
        self.elementView.isUserInteractionEnabled = false
        self.elementView.isHidden = true
        self.elementView.backgroundColor = UIColor.black
        self.elementView.addSubview(self.imgView)
        self.elementView.layer.masksToBounds = true

        self.imgView.isUserInteractionEnabled = false

        // Place the video element view inside the WebView's superview
        self.webView.superview?.addSubview(self.elementView)
    }


    deinit {
        NSLog("PluginImgRenderer#deinit()")
    }


    func run() {
        NSLog("PluginImgRenderer#run()")
    }


    func render(_ image: UIImage) {
        NSLog("PluginImgRenderer#render()")

        if self.image != nil {
            self.reset()
        }

        self.image = image
        self.imgView.image = self.image
    }

    func refresh(_ data: NSDictionary) {
        let orientation = UIApplication.shared.statusBarOrientation
        var addonHeight = 20
        if UIDevice().userInterfaceIdiom == .phone {
            if UIScreen.main.nativeBounds.height == 2436 {
                addonHeight = 44
            }
        }
        if orientation.isLandscape {
            addonHeight = 0
        }
        let elementLeft = data.object(forKey: "elementLeft") as? Float ?? 0
        let elementTop = (data.object(forKey: "elementTop") as? Float ?? 0) + Float(addonHeight)
        let elementWidth = data.object(forKey: "elementWidth") as? Float ?? 0
        let elementHeight = data.object(forKey: "elementHeight") as? Float ?? 0
        var imgViewWidth = data.object(forKey: "videoViewWidth") as? Float ?? 0
        var imgViewHeight = data.object(forKey: "videoViewHeight") as? Float ?? 0
        let visible = data.object(forKey: "visible") as? Bool ?? true
        let opacity = data.object(forKey: "opacity") as? Float ?? 1
        let zIndex = data.object(forKey: "zIndex") as? Float ?? 0
        let mirrored = data.object(forKey: "mirrored") as? Bool ?? false
        let clip = data.object(forKey: "clip") as? Bool ?? true
        let borderRadius = data.object(forKey: "borderRadius") as? Float ?? 0

        let imgViewLeft: Float = (elementWidth - imgViewWidth) / 2
        let imgViewTop: Float = (elementHeight - imgViewHeight) / 2

        self.elementView.frame = CGRect(
            x: CGFloat(elementLeft),
            y: CGFloat(elementTop),
            width: CGFloat(elementWidth),
            height: CGFloat(elementHeight)
        )

        // NOTE: Avoid a zero-size UIView for the video (the library complains).
        if imgViewWidth == 0 || imgViewHeight == 0 {
            imgViewWidth = 1
            imgViewHeight = 1
            self.imgView.isHidden = true
        } else {
            self.imgView.isHidden = false
        }

        self.imgView.frame = CGRect(
            x: CGFloat(imgViewLeft),
            y: CGFloat(imgViewTop),
            width: CGFloat(imgViewWidth),
            height: CGFloat(imgViewHeight)
        )

        if visible {
            self.elementView.isHidden = false
        } else {
            self.elementView.isHidden = true
        }

        self.elementView.alpha = CGFloat(opacity)
        self.elementView.layer.zPosition = CGFloat(zIndex)

        // if the zIndex is 0 (the default) bring the view to the top, last one wins
        if zIndex == 0 {
            self.webView.superview?.bringSubview(toFront: self.elementView)
        }

        if !mirrored {
            self.elementView.transform = CGAffineTransform.identity
        } else {
            self.elementView.transform = CGAffineTransform(scaleX: -1.0, y: 1.0)
        }

        if clip {
            self.elementView.clipsToBounds = true
        } else {
            self.elementView.clipsToBounds = false
        }

        self.elementView.layer.cornerRadius = CGFloat(borderRadius)
    }


    func close() {
        NSLog("PluginImgRenderer#close()")

        self.reset()
        self.elementView.removeFromSuperview()
    }


    /**
     * Private API.
     */


    fileprivate func reset() {
        NSLog("PluginImgRenderer#reset()")

        self.imgView.image = nil
        self.image = nil
    }
}
