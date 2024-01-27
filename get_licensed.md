---
layout: ee_page_layout
title: Eagle Eyes - Get Licensed
permalink: /get_licensed/
---

# Eagle Eyes Licensing Plans

This page will allow you to find, buy, and use licence keys for Eagle Eyes Scan.

For the early adopter phase, you can use the special, limited-time early adopter licence: 

<div class="license-key-container">
    <textarea id="licenseKey" readonly rows="4" style="width: 100%; margin-bottom: 10px;">
5BZF6ENGPZRNMINCCTUNS2TIBKWRU7U3SLCGZXDXW6O673OK6DXFYIRLJS66VLKNZGGZWBKECWQCX6W4HU6B3SR3DG6IEF5UZBJXTP2OSAG6HWAAGKIZAYP6O3VPP5VPMQ4JFGBNUBCIEXZL2OX4OAAJBUONVASH7APEYEYFOGHIUEQWI6U5TSYBKYEEEQDXVEL7TWG4Y6MWLNSWKENTMZIAFWU3WPXUPXBQY3H2IX2J5Y7XMV56MVFVHBAELFE45KL32AJ2TWJTU6GG5XUFZYIALXZHT424YIB6J3HTKY2TAACYBGG4YFSC3ZIQOPSZ2PX6SKPOFE6L5HXOV33F2UE3HZUWXVYRFNJOKIJT4H5MCBPEAL22GT42ETEUWIHCAT6ZAW5CQ2KUHZVXN7LGMBIAVYWDISWABLCAGJ3HWDUSGYJRI5SWZ4SOIFV2AWN4JLJLBHQQNZC6D74MDX7LTMI6XGRVLNXKXRHGBYMANUMBV4YFWZPES
    </textarea>
    <button onclick="copyLicenseKey()">Copy License Key</button>
</div>

<script>
function copyLicenseKey() {
    var copyText = document.getElementById("licenseKey");
    copyText.select();
    document.execCommand("copy");
    // Optional: Display a message or change the button text to indicate the copy was successful
    alert("License key copied to clipboard");
}
</script>
