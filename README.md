# Website Template

A complete, beginner-friendly website template built with plain HTML, CSS, and JavaScript. There is nothing to install and no build step: open a file, change some words, and publish it for free.

What you get:

- Dark mode by default, plus a light-mode button that remembers each visitor's choice
- A sticky menu that folds into a "hamburger" button on phones
- Five pages: Home, About, Showcase, Features, and Contact
- Every color, font, size, and corner radius controlled from one settings list
- Fade-in and hover animations with one on/off switch, plus automatic respect for "reduce motion"
- Accessibility built in: keyboard friendly, screen reader labels, strong color contrast, and no text smaller than 16px

## Quick start (about 5 minutes)

1. Put the `website-template` folder somewhere easy to find, such as your Desktop.
2. Double-click `index.html`. The site opens in your web browser.
3. Open `index.html` in a text editor. Free choices include Visual Studio Code, Notepad++ (Windows), or the Notepad or TextEdit app already on your computer. (In TextEdit, choose Format > Make Plain Text first.)
4. Find `Your Headline Here`, type something new, save the file, and refresh the browser tab.

That's the whole workflow: edit, save, refresh. Search any file for `EDIT ME:` to find every spot that's meant for you.

## What's in the folder

```text
website-template/
  index.html        Home page. Hosts open this file first, so keep its name.
  about.html        About page: story, mission/vision/values, impact numbers, timeline
  showcase.html     Showcase page: a grid of picture cards
  features.html     Features page: rows that alternate picture and text
  contact.html      Contact page: a demo form and your contact details
  css/
    style.css       The look: colors, fonts, spacing, layout, and animations
  js/
    main.js         The behavior: theme button, mobile menu, fade-ins, demo form
  images/
    logo.svg        Logo and browser-tab icon
    hero.svg        Home page picture
    about.svg       About page picture
    feature-1.svg   Features page pictures (also feature-2.svg and feature-3.svg)
    showcase-1.svg  Showcase pictures (through showcase-6.svg)
  README.md         This guide
```

Every page has the same header and footer, copied into each file. If you change the menu or the footer, make the same change on all five pages.

## Change the colors

Open `css/style.css` and go to section 1, SETTINGS.

1. Find `--accent: #36cfff;` under the label ACCENT COLOR.
2. Replace `#36cfff` with your color's hex code (a `#` followed by six characters). Any online "color picker" shows hex codes.
3. Save and refresh. Buttons, links, the menu highlight, focus outlines, and the blueprint grid all update.

More color tips:

- The other dark-mode colors (backgrounds, text, and lines) sit just below the accent. Light-mode colors are in section 2.
- Light mode makes a deeper shade of your accent automatically, so you only set the accent once.
- If you pick a dark accent, change `--color-on-accent` to `#ffffff` so button text stays readable.
- `--accent-2` is a small "signal" color used for just two dots: the home page badge and the newest timeline item.
- Check every new text and background pair with a free contrast checker, such as WebAIM's. Aim for 4.5:1 or higher.
- To start visitors in light mode, open `js/main.js` and change `DEFAULT_THEME` to `"light"`.

## Change the fonts

In section 1 of `css/style.css`, `--font-body` and `--font-heading` hold font "stacks": the browser uses the first font in the list that's installed on the visitor's device. The template lists Lato first, then Gill Sans, Gill Sans MT, and Calibri, so nothing has to be downloaded.

To make sure every visitor sees Lato, bundle it with your site:

1. Download Lato for free from Google Fonts (fonts.google.com, search for "Lato", then choose Download).
2. Make a new folder named `fonts` next to `index.html`, and copy `Lato-Regular.ttf` and `Lato-Bold.ttf` into it.
3. Paste this at the very top of `css/style.css`:

```css
@font-face {
  font-family: "Lato";
  src: url("../fonts/Lato-Regular.ttf") format("truetype");
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "Lato";
  src: url("../fonts/Lato-Bold.ttf") format("truetype");
  font-weight: 700;
  font-display: swap;
}
```

`../` means "go up one folder." The CSS file lives in `css/`, so it steps up a level to reach `fonts/`.

Text sizes are in the same settings list (`--text-sm` through `--text-hero`). For accessibility, keep every size at `1rem` (16px) or larger.

## Change the text

- Open any page and change the words between the tags: `<h2>What We Offer</h2>` becomes `<h2>Your Heading</h2>`. Leave the tags (the parts inside `< >`) alone.
- Each page has a `<title>` (the browser tab) and a `<meta name="description">` (the summary search engines may show) near the top. Update both on every page.
- Keep one `<h1>` per page, then `<h2>` for sections and `<h3>` inside them. Screen reader users move around a page by these heading levels.
- To change "Brand Name" everywhere at once, use your editor's search-and-replace across files (in Visual Studio Code: Edit > Replace in Files).

## Change the images

1. Save your picture in the `images` folder. Use lowercase names with dashes and no spaces, like `team-photo.jpg`. Web hosts treat `Photo.JPG` and `photo.jpg` as different files.
2. In the HTML, change the `src` to your file name: `src="images/team-photo.jpg"`.
3. Change `width` and `height` to your picture's real size in pixels. This reserves space so the page doesn't jump while it loads.
4. Rewrite the `alt` text to describe the picture for people who can't see it, for example `alt="Three volunteers packing donation boxes"`. If a picture is only decoration, use `alt=""`.

Size tips: the hero picture is 640 x 520, and the others are 800 x 600 (a 4:3 shape fits the cards best). Keep each file under about 300 KB; a free tool such as Squoosh can shrink photos.

To change the logo, replace `images/logo.svg` with your own file of the same name. It's also the browser-tab icon. If you use a different name or a PNG, update the `src` in the header and the footer, and the `<link rel="icon">` line in the head, on every page.

## Turn animations on or off

Open `js/main.js` and find this line near the top:

```js
const ANIMATIONS_ON = true;
```

Change `true` to `false` to stop all fade-ins and hover movement. Visitors whose devices are set to "reduce motion" always get the still version anyway.

To stop one element from fading in, delete the word `reveal` from its `class`. To make another element fade in, add `reveal` to its class. Speed and distance settings are under MOTION in section 1 of `css/style.css`.

## Add a new page and menu link

1. Copy `about.html` and rename the copy, for example `services.html` (lowercase, no spaces).
2. In the new file, change the `<title>`, the description, the last breadcrumb item, the `<h1>`, and the content inside `<main>`. Delete any sections you don't need.
3. Add a menu link to the header on every page, including the new one:

```html
<li><a class="nav-link" href="services.html">Services</a></li>
```

4. Add a matching footer link on every page:

```html
<li><a href="services.html">Services</a></li>
```

5. Open the new page. Its menu link highlights automatically.

If the menu gets crowded on tablets, raise the switch point: change `767px` and `768px` in section 7 of `css/style.css`, and `DESKTOP_MENU_WIDTH` in `js/main.js`, to matching new numbers (for example 899px, 900px, and 900).

## Connect the contact form

The form looks real, but it doesn't send anything yet. Static hosts only hand out files; nothing runs on them that could receive a message and email it to you. For now, `js/main.js` shows a "demo" note when someone presses the button. When you're ready, connect a free form service.

**Option 1: Formspree (works on any host)**

1. Create a free account at formspree.io and make a new form.
2. Copy the form's endpoint address. It looks like `https://formspree.io/f/abcd1234`.
3. In `contact.html`, change the form tag to:

```html
<form class="form" method="post" action="https://formspree.io/f/abcd1234">
```

**Option 2: Netlify Forms (only if you host on Netlify)**

1. In your Netlify site dashboard, open Forms and turn on form detection.
2. In `contact.html`, change the form tag to:

```html
<form class="form" method="post" name="contact" data-netlify="true">
```

3. Upload the site again. Messages appear under Forms in your Netlify dashboard.

Either way, notice that `data-demo-form` is gone from the form tag. Removing it switches off the demo note so real messages can go through. Every field already has a `name`, which is how the service labels each answer. Free plans have monthly limits that change over time, so check the provider's website.

## Publish for free

### GitHub Pages

1. Create a free account at github.com.
2. Create a new public repository (a project folder on GitHub), for example `my-website`.
3. Choose Add file > Upload files, and drag in everything INSIDE your site folder, so `index.html` sits at the top level and not inside another folder. Click Commit changes.
4. Open Settings > Pages. Under Build and deployment, set Source to Deploy from a branch, choose the `main` branch and the `/ (root)` folder, and click Save.
5. Wait a few minutes (it can take up to 10). Your site appears at `https://your-username.github.io/my-website/`.

To update the site, upload your changed files the same way.

### Netlify (drag and drop)

1. Create a free account at netlify.com and log in, so the site is saved to your account. (Sites dropped without an account are temporary.)
2. Go to app.netlify.com/drop.
3. Drag your whole site folder (the one that contains `index.html`) onto the page. If it's zipped, unzip it first.
4. In seconds you get a live address ending in `.netlify.app`, which you can rename in the site settings.

To update, open your site's Deploys page in Netlify and drag the updated folder onto the drop area.

## Accessibility checklist

Run through this list after any big change:

- Every meaningful picture has alt text that describes it.
- Headings go in order (h1, then h2, then h3) without skipping a level.
- Text and background colors pass a contrast checker (4.5:1 or higher).
- Press Tab through each page: you can reach every link and button, and you can always see where you are.
- Zoom the browser to 200%: everything still fits and reads well.
- No text is smaller than 16px.

## Troubleshooting

- **The page looks plain, with no colors:** the CSS isn't loading. Check that `style.css` is still inside a folder named `css`, next to your HTML files.
- **My change doesn't show up:** save the file, then hard-refresh the browser (Ctrl+F5 on Windows, Cmd+Shift+R on a Mac).
- **Pictures work on my computer but not online:** check capital letters in file names. `images/Photo.jpg` and `images/photo.jpg` are different files on a web host.
- **The theme isn't remembered when I double-click files:** some browsers limit saved settings for files opened straight from your computer. Once the site is online, the choice is remembered on every page.
- **I added a page, but the menu didn't change everywhere:** the menu is copied into each page. Add the new link to all of them.
