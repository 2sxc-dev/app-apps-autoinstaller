#if NETCOREAPP // Oqtane
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
#else // DNN
using System.Web.Http;
using DotNetNuke.Web.Api;
#endif
using System;
using System.Linq;
using System.Text.RegularExpressions;
using Dynlist = System.Collections.Generic.IEnumerable<dynamic>;

using ToSic.Sxc.Services; // Make it easier to use https://r.2sxc.org/services
using ToSic.Eav.DataFormats.EavLight; // For Auto-Conversion (see below)

using Newtonsoft.Json;

// using Microsoft.Extensions.DependencyInjection;
// using DotNetNuke.Common.Extensions;


[AllowAnonymous]      // define that all commands can be accessed without a login
// Inherit from Custom.Hybrid.Api14 to get features like App, CmsContext, Data etc.
// see https://docs.2sxc.org/web-api/custom/index.html
public class AppListDataController : Custom.Hybrid.Api14 /*TODO: Custom.Hybrid.ApiTyped*/
{
    [HttpGet]   // [HttpGet] says we're listening to GET requests
    // TODO: AppDataDto     
    public dynamic GetListOfData(string QueryName, string ModuleId, string SexyContentVersion, string Platform, string SysVersion, string SxcVersion)
    {
        var platform = Platform;
        // if oqtane, it must use the current download in the files...
        var isOqtane = platform.Equals("Oqt", StringComparison.OrdinalIgnoreCase);
        var platformVersion = SysVersion;
        var requesting2sxcV = SxcVersion;

        // correct incomming version to ensure it's in the format ##.##.##
        var v2sxc = new Version(requesting2sxcV);

        var allInstalls = AsList(App.Query[QueryName]);

        // Dnn Installer
        var applicableFor2sxc = allInstalls
            .Where(ai => new Version(ai.Min2sxcVersion).CompareTo(v2sxc) < 1)
            .OrderByDescending(ai => ai.Min2sxcVersion);

        var applicableVersions = applicableFor2sxc
            .Where(ai => !string.IsNullOrEmpty(ai.MinDnnVersion));


        if (isOqtane)
            applicableVersions = applicableFor2sxc.Where(ai => !string.IsNullOrEmpty(ai.MinOqtVersion));

        var bestAI = applicableVersions.First();
        var title = bestAI.Title; // example "Recommended Apps for 2sxc 16.01 - latest"

        var jsonToInstall = "";

        foreach (var item in AsList(bestAI.Apps))
        {
            var release = AsList(item.Releases as object).Where(re => new Version(re.Min2sxc).CompareTo(v2sxc) < 1).OrderBy(x => x.Min2sxc != null).ThenByDescending(x => x.Min2sxc).ThenByDescending(x => x.Version).FirstOrDefault();

            if (release != null)
            {
                var downloadUrl = release.Download;
                jsonToInstall += "{ title:'" + @title + "', downloadUrl:'" + @downloadUrl + "', gitHubRelease:'" + @release.Github + "', displayName:'" + @item.Name + "', gitHub:'" + @item.GitHub + "', icon:'" + @item.Icon + "', urlKey:'" + @item.Urlkey + "', shortDescription:'" + @item.ShortDescription + "', version:'" + @release.Version + "', minDnn:'" + @release.MinDnn + "', min2Sxc:'" + @release.Min2sxc + "', minOqt:'" + @release.MinOqt + "', guid:'" + @item.AppGuid + "'},";
            }
        }

        if (jsonToInstall.Length > 0)
            jsonToInstall = jsonToInstall.Substring(0, jsonToInstall.Length - 1);

        jsonToInstall = "[" + jsonToInstall + "]";

        return JsonConvert.DeserializeObject(jsonToInstall);
    }

    [HttpPost]        // [HttpPost] says we're listening to POST requests
    [ValidateAntiForgeryToken] // protects from the users not on your site (CSRF protection)
    public int Sum([FromBody] dynamic bodyJson) // post body { "a": 2, "b": 3 }
    {
        int a = bodyJson.a;
        int b = bodyJson.b;
        return a + b;
    }
}
