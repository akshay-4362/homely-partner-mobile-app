import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';

const SECTIONS = [
  {
    title: 'Preamble',
    body: `(A) These Terms and Conditions ("Terms") govern the use of services made available on or through https://www.homelyoapp.com and/or the Homelyo Partner mobile app (collectively, the "Platform" and together with the services made available on or through the Platform, "Services"). These Terms also include our Privacy Policy and any guidelines, additional, or supplemental terms, policies, and disclaimers made available or issued by us from time to time ("Supplemental Terms"). The Privacy Policy and the Supplemental Terms form an integral part of these Terms.

(B) The Terms constitute a binding and enforceable legal contract between Homelyo Technologies India Pvt. Ltd. ("Homelyo", "we", "us", or "our"), and you, an independent third-party service provider ("you" or "Service Professional"). By using the Services, you represent and warrant that you have the full legal capacity and authority to agree and bind yourself to these Terms.

(C) By using the Services, you agree that you have read, understood, and are bound by these Terms, as amended from time to time, and that you will comply with the requirements listed here. These Terms expressly supersede any prior written agreements with you. If you do not agree to these Terms, please do not use the Services.`,
  },
  {
    title: '1. Services',
    body: `(a) The Services include the provision of the Platform that enables you to provide different home-based services to end-customers registered on the Platform ("Customers"). As a part of the Services, Homelyo (i) assists you with determining amounts payable by Customers to you for the services you render, (ii) facilitates the maximum and efficient utilisation of your time, (iii) takes measures to maximise your earning potential, and (iv) facilitates the transfer of payments from Customers to you and collects payments on your behalf.

(b) The services rendered by you are referred to as "Pro Services". Our "Services" do not include the Pro Services, and Homelyo is not responsible for the provision of Pro Services. Homelyo does not employ you or any other Service Professional, nor are Service Professionals the agents, contractors, or partners of Homelyo. You are solely liable and responsible for the Pro Services that you offer or otherwise provide through the Platform.

(c) The Platform is solely for your commercial use and is intended for use only within India.

(d) A key part of the Services is Homelyo's ability to send you text messages, including in connection with your bookings, your utilisation of the Services, or as a part of its promotional and marketing strategies. While you may opt out of receiving these text messages by contacting Homelyo at privacy@homelyoapp.com, you agree and acknowledge that this may impact Homelyo's ability to provide the Services to you.

(e) Prior to the activation of your ability to use certain parts of the Services and provide Pro Services through the Platform, you are required to complete an orientation programme to understand how the Platform works and ways to maximise your earning potential. You hereby agree to complete such orientation programme(s).

Homelyo reserves the right to charge a certain non-refundable fee towards your orientation/onboarding onto the platform at its sole discretion, which will be intimated to you in advance and recovered in instalments from your earnings after you join the platform.`,
  },
  {
    title: '2. Account Creation',
    body: `(a) To avail the Services and provide the Pro Services through the Platform, you will be required to create an account on the Platform ("Account"). You will be required to furnish certain details and documents, including but not limited to your name, phone number, address, age, valid government-issued identification, and government approvals that permit you to offer Pro Services under applicable law. To create an Account, you must be at least 18 (Eighteen) years of age.

(b) You warrant that all information furnished in connection with your Account is and shall remain accurate and true. You agree to promptly update your details on the Platform in the event of any change to this information.

(c) You agree that Homelyo, through third parties, may undertake your background verification, at your sole cost, to fulfil due diligence and safety obligations prior to the approval of your Account, activating your access to the Services, and permitting you to provide Pro Services. Homelyo takes commercially reasonable efforts to undertake background verifications and is not responsible or liable for ensuring the safety, security, or welfare of the Service Professionals or the Customers.

(d) You may only own, operate, and possess one Account. If Homelyo discovers that you possess more than one Account, it will have the right to revoke, without notice, your access to the Platform and the Services.

(e) You are solely responsible for maintaining the security and confidentiality of your password and agree to immediately notify us of any disclosure or unauthorised use of your Account. You will not share your login credentials with any other person. If Homelyo determines that you have shared your login credentials or allowed another person to use your Account, it may suspend or terminate your access without notice.

(f) You are liable and accountable for all activities that take place through your Account. We shall not be liable for any unauthorised access to your Account.

(g) You agree to receive communications from us regarding (i) information about us and the Services, (ii) promotional offers and services from us and our third-party partners, and (iii) any other matter in relation to the Services.`,
  },
  {
    title: '3. Bookings and Credits',
    body: `(a) The Platform permits you to accept requests for the Pro Services you offer based on your availability ("Leads"). To confirm a request, you should follow the instructions on the Platform and provide necessary information.

(b) Ranking of Service Professionals: Your ranking on the Platform is based on the following factors in descending order of importance:
• Your ratings on the Platform
• Your location
• The number of Leads you have already accepted

(c) Homelyo Credits and Pre-Deposits:
(i) You shall, at all times, be required to maintain a minimum balance of credits ("Credits") to be able to access parts of the Services. Credits will be credited to your Account against payment being made by you. You agree and acknowledge that your use of the Services may be affected if you do not have the requisite Credits. Homelyo reserves the sole discretion to require the payment of additional fees in respect of (A) the provision of Leads in certain market segments or (B) the provision of additional Services.
(ii) You agree that a pre-determined amount of Credits will be deducted from your Account in order to be able to accept Leads. The details required to connect you with a Customer will only be communicated to you after such deduction. The quantum of such deduction will be based on the aggregate value of the Lead(s) and will be communicated to you from time to time, or before the communication of a Lead.
(iii) To ensure maintenance of adequate Credits, you acknowledge and authorise Homelyo to deduct certain amounts from the payments made by Customers to you.
(iv) You may also use Credits to purchase goods and services offered by Homelyo to you from time to time.

(d) Promotions and Subscription Packages:
(i) Homelyo may, at its sole discretion, issue Credits free of charge to your Account, and/or may create promotional codes that may be redeemed for Account credits or other features or benefits ("Promo Credits"), subject to additional terms. You agree that Promo Credits (A) shall not be duplicated, sold, or transferred, (B) may be disabled by Homelyo at any time, (C) are not valid for cash, and (D) may expire prior to your use.
(ii) Based on your ratings and reviews by Customers, Homelyo may, at its sole discretion, from time to time offer subscription packages or minimum business guarantees subject to applicable terms and conditions. Upon purchasing such subscription package or accepting a minimum business guarantee, you may be entitled to preferential Leads (i.e., Lead allocation on priority and lower convenience fee deductions).
(iii) If Homelyo is unable to provide you with a minimum number of preferential service requests, Homelyo will compensate you for such deficiency, provided you meet the conditions communicated prior to purchase or acceptance.
(iv) Homelyo reserves the right to withhold or deduct Credits in the event that Homelyo reasonably determines that the use of the Credits was in error, fraudulent, illegal, or in violation of applicable terms or these Terms.

(e) Performance-Based Schemes: Homelyo may from time to time introduce schemes for high-performing Service Professionals to be allotted preferential Leads. The parameters to determine a Service Professional's performance shall include service feedback received from Customers, proportion of Leads accepted, and other parameters as communicated to you from time to time.`,
  },
  {
    title: '4. Helpers / Assistants',
    body: `(a) You may not engage another person to assist you in the provision of the Pro Services ("Helper") unless expressly permitted by Homelyo. You shall be solely liable for all acts and omissions made by any Helper you have engaged.

The following terms apply if you choose to appoint a Helper where permitted:
• You must provide Pro Services in a category where the engagement of Helpers is permitted by Homelyo
• The Helper must be registered on the Platform in their capacity as your Helper
• The Helper must be at least 18 (Eighteen) years of age at the time of registration
• The Helper must be legally permitted to assist you in the provision of Services to Customers

(b) Unless specified otherwise, you may not use more than one Helper while providing a Pro Service to a Customer.

(c) You shall accompany the Helper, in person, at all times, while providing a Pro Service to a Customer.

(d) Any breach of these Terms by the Helper shall be considered a breach by you. You shall indemnify and hold harmless Homelyo and its affiliates and their officers, directors, employees, and agents from any and all claims, demands, losses, liabilities, and expenses (including attorneys' fees) arising out of, or in connection with, any act or omission by the Helper.

(e) You agree that there is no contract of employment between Homelyo and the Helper, and that you have engaged the Helper in your capacity as an independent contractor.

(f) You shall be solely liable for compensating the Helper. Homelyo shall not be liable to compensate the Helper for the provision of the Pro Services or any expense incurred by the Helper. Homelyo shall not be liable to pay you any extra compensation for engaging a Helper.`,
  },
  {
    title: '5. Use of Recommended Products',
    body: `(a) Homelyo may recommend certain products to you in connection with your delivery of the Pro Services to ensure that genuine products are being used. You may purchase such products from Homelyo or any other provider acceptable to Homelyo. You are not mandatorily required to purchase products from Homelyo, and are free to purchase them from any other vendor, but in such instances, you are required to ensure that the products you have procured comply with Homelyo's recommended safety and quality parameters.

(b) In case any Non-Verifiable Products (such as disposables, spa oils, etc.) are being used to provide the Pro Service, the same should be purchased only from Homelyo or its group companies, as Homelyo is currently unable to verify the quality of disposables purchased from third parties. Use of non-standard, non-verifiable products from third-party vendors could compromise the health and hygiene of the Customers.

(c) If Homelyo has a reasonable suspicion that you have deviated from the recommended list of products or have used Non-Verifiable Products procured from a third party, Homelyo shall be entitled to take appropriate measures against you, including re-training or other measures as it deems fit to maintain the integrity of the Platform and ensure safety and quality parameters.

(d) You can purchase Homelyo brand collateral from Homelyo. While it is not mandatory, to promote trust and safety with Customers it is advisable to purchase and use Homelyo brand collateral while using the Services.`,
  },
  {
    title: '6. Pricing, Payment Terms, and Taxes',
    body: `(a) Subsequent to your delivery of Pro Services to the Customers through your use of the Services, Homelyo will facilitate the payment of the applicable amount to be paid by the Customer to you as your limited payment collection agent. Payment of the amount payable by the Customer in such manner shall be considered the same as payment made directly by the Customer to you, and you hereby authorise Homelyo to collect and process payments on your behalf. Such payments will be inclusive of applicable taxes where required by law. Amounts paid by the Customer to you are final and non-refundable, unless otherwise determined by Homelyo in accordance with these Terms.

(b) Homelyo shall derive its fee for providing the online marketplace services to its users and issues a separate invoice to Customers. In case a Customer pays online, you authorise Homelyo to retain its fee from the amount received online, and remit the balance monies to you. In the event a Customer pays you for your Pro Services and Homelyo's fee in cash, you authorise Homelyo to adjust its fee from future payouts.

(c) In the event you cancel a request placed by a Customer after accepting a request, Homelyo shall be at liberty to determine whether or not to refund the Pre-Deposit to you.

(d) You acknowledge that Homelyo may, from time to time, advance certain amounts to you ("Business Advances"), upon your written request and subject to reasonable terms and conditions. You further acknowledge and authorise Homelyo to deduct the relevant amounts towards repayment of such Business Advances from the Credits or payouts due to you.

(e) You acknowledge and authorise Homelyo to deduct relevant amounts towards payment of equated monthly instalments to be paid to Non-Banking Financial Companies ("NBFCs") when loans have been availed by you from such NBFCs for the purposes of offering Pro Services on the Platform. You further authorise Homelyo to deduct any charges for other facilities or services that may be provided to you from time to time (including charges for safety equipment, penalties or fines, fees for onboarding, demand surcharge, fees for cancellation, or late fees) from payments due to you.

(f) Homelyo shall have the right to defer a part of the payment payable to you by a Customer, which may be required in certain cases, for a maximum period of 90 (ninety) days, for reasons as may be communicated to you.

(g) Taxes: You agree and acknowledge that:
(i) Homelyo acts solely as an intermediary for the collection of payments and fees between Customers and you. You are solely responsible for determining your own tax reporting requirements in consultation with tax advisors. Homelyo shall not be responsible or liable in any manner in relation to tax liability that you may incur.
(ii) In cases of tax deducted at source under Section 194-O of the Income Tax Act, Homelyo will make deductions at 1%, unless you are unable to provide your PAN or Aadhaar details to Homelyo in a timely manner, and in such situations, Homelyo will make deductions at 5%.
(iii) TDS shall be deducted only on the value of services provided by you to the Customer. TDS shall not be deducted on any goods or physical materials that might be used during the Pro Services. It is your responsibility to determine any tax liability or implications in relation to goods or physical materials.
(iv) There may be changes to the above provisions as per updates or changes in applicable laws.`,
  },
  {
    title: '7. Conduct',
    body: `(a) Homelyo prohibits discrimination against Customers on the basis of race, religion, caste, national origin, disability, sexual orientation, sex, marital status, gender identity, age, or any other characteristic that may be protected under applicable law. Such discrimination includes but is not limited to any refusal to provide the Pro Services based on any of these characteristics.

(b) We request that you treat all Customers with courtesy and respect. We reserve the right to withhold access to the Services at our absolute discretion if you behave towards any Customer in a manner which is discourteous, disrespectful, abusive, or which we otherwise deem to be inappropriate or unlawful.`,
  },
  {
    title: '8. User Content',
    body: `(a) Our Platform may contain interactive features or services that allow users who have created an account or profile with us to post, upload, publish, display, transmit, or submit comments, reviews, suggestions, feedback, ideas, or other content on or through the Platform ("User Content").

(b) As part of the effective provision of the Services and quality control purposes, we may request reviews from you about Customers, and you agree and acknowledge that Customers may provide reviews about you to us. You must not knowingly provide false, inaccurate, or misleading information in respect of the reviews.

(c) You grant us a non-exclusive, worldwide, perpetual, irrevocable, transferable, sublicensable, and royalty-free licence to (i) use, publish, display, store, host, communicate, distribute, make available, modify, adapt, translate, and create derivative works of the User Content for the functioning of and in connection with the Services and (ii) use User Content for advertising and promoting the Services.

(d) In connection with these Terms and the licences granted under this clause, you hereby waive any claims arising out of any moral rights or other similar rights relating to the User Content.

(e) You agree and acknowledge that Homelyo may, without notice to you, remove, or otherwise restrict access to User Content that, in its sole discretion, violates these Terms.`,
  },
  {
    title: '9. Consent to Use Data',
    body: `(a) You agree that we may, in accordance with our Privacy Policy, collect and use your personal data. The Privacy Policy explains the categories of personal data that we collect or otherwise process about you and the manner in which we process such data.

(b) In certain instances, you may be required to furnish identification proof to avail the Services or to provide the Pro Services, and hereby agree to do so. A failure to comply with this request may result in your inability to use the Services or provide the Pro Services.

(c) In addition to any consent you may provide pursuant to the Privacy Policy, you hereby consent to us sharing your information with our affiliates or other third-party service providers. We may use information and data pertaining to your use of the Services for provision of the Services, analytics, trend identification, and purposes of statistics to further enhance the effectiveness and efficiency of our Services.

(d) Subject to applicable laws, we may be directed by law enforcement agencies or the government and related bodies to disclose data in relation to you in connection with criminal proceedings. You understand and agree that in such instances we shall have the right to share such data with relevant agencies or bodies.

(e) Use of Artificial Intelligence: You understand and acknowledge that Homelyo may use artificial intelligence (AI) tools to enhance your profile pictures to ensure standardisation and consistency. These enhancements may involve modifications such as background standardisation, uniform adjustments, lighting correction, and other improvements for visual consistency. By accepting these Terms, you grant Homelyo the right to use your submitted photographs and related images for the purpose of generating enhanced versions using AI. You will have the option to replace it at any time through your in-app settings.

Disclaimer: Profile pictures enhanced using AI are exclusively for use as your profile picture within the Homelyo platform. Any use of these images outside of your official Homelyo profile is done at your own risk and is not endorsed or supported by Homelyo.`,
  },
  {
    title: '10. Third-Party Services',
    body: `(a) The Platform may include services, content, documents, and information owned by, licensed to, or otherwise made available by a third party ("Third-Party Services") and contain links to Third-Party Services. You understand and acknowledge that Third-Party Services are the sole responsibility of the third party that created or provided it and that use of such Third-Party Services is solely at your own risk.

(b) We make no representations and exclude all warranties and liabilities arising out of, or pertaining to, such Third-Party Services, including their accuracy or completeness. Should you avail a Third-Party Service, you shall be governed and bound by the terms and conditions, and privacy policy of the third parties providing the Third-Party Services. Further, all intellectual property rights in, and to Third-Party Services, are the property of the respective third parties.`,
  },
  {
    title: '11. Your Responsibilities',
    body: `(a) You represent and warrant that all information that you provide in relation to the Services is complete, true, and correct on the date of agreeing to these Terms and shall continue to be complete, true, and correct while you avail the Services. Should any information that you provide change during the existence of these Terms, you undertake to immediately bring such change to our notice.

(b) You shall extend all cooperation to us in our defence of any proceedings that may be initiated against us due to a breach of your obligations or covenants under these Terms.

(c) In respect of the User Content, you represent and warrant that you:
• own all intellectual property rights (or have obtained all necessary permissions) to provide User Content
• are solely responsible for all activities that occur on or through your account
• will not provide feedback for services that you have performed in your capacity as a Service Professional
• will not submit User Content that violates any third-party rights, contains viruses or harmful files, is obscene, paedophilic, racially objectionable, or encouraging illegal activity
• will not submit User Content that threatens the unity, integrity, or sovereignty of India
• will not impersonate any person or communicate false, misleading information
• shall abide by community guidelines and any policies as may be issued by Homelyo from time to time

(d) You shall not use the Services in any manner except as expressly permitted in these Terms. Without limiting the generality of the preceding sentence, you shall not:
• infringe any proprietary rights, including copyrights, patents, trademarks, or trade secrets
• copy, display, distribute, modify, publish, reproduce, store, transmit, post, translate, or create any derivative works from or license the Services
• use the Services to transmit data that contains viruses, trojan horses, worms, keystroke loggers, spyware, adware, or any other harmful programmes
• use any robot, spider, or other automated device to monitor or copy the Services
• use the Services in any unlawful manner, for fraudulent or malicious activities
• decompile, reverse engineer, or disassemble the Services
• violate applicable laws in any manner

(e) You warrant that you shall not engage in any activity that interferes with or disrupts the Services.

(f) In respect of the Pro Services offered by you to Customers, you represent and warrant that:
(i) You shall be fully responsible and liable for the acceptance, delivery, and performance of the Pro Services that you provide, including any and all acts and/or omissions therein.
(ii) In case your performance of Pro Services involves usage or supply of any goods such as spare parts or consumables, such goods shall be in full conformity with all applicable standards, including express and implied warranties therein.
(iii) All warranty obligations in respect of the Pro Services (including usage and/or supply of any ancillary goods) shall be the sole responsibility of the Service Professional, i.e. you.`,
  },
  {
    title: '12. Platform Safety and Anti-Fraud Obligations',
    body: `(a) For the safety and privacy of the Customer and the Service Professional and delivery of Pro Services in adherence to the service standards of the Platform, it is necessary that during the Period, any and all Pro Services provided by you to a Customer are provided only through the Platform and in accordance with the terms of these Terms. Any direct or indirect delivery of a Pro Service to a Customer outside of the Platform, whether in whole or in part, and irrespective of whether the request is initiated by the Customer, would be deemed to be a breach of these Terms and a ground for termination, unless you are able to provide a satisfactory explanation for the same.

You agree that this limitation is reasonable, fair, and necessary for your safety and privacy as well as that of the Customer's and for the protection of the legitimate business interests of Homelyo. However, nothing in this clause shall restrict you from providing the same Pro Service or a similar service to the Customer upon termination of these Terms, by either Party, for any reason whatsoever.

(b) Nothing in the clause above restricts you from providing same or similar Pro Services during the Period to any person other than a Customer, whether directly or indirectly, either independently or through affiliation with any online or offline business entity engaged in a business similar to Homelyo.`,
  },
  {
    title: '13. Our Intellectual Property',
    body: `(a) All rights, titles, and interest in, and to the Services, including all intellectual property rights arising out of the Services, are owned by or otherwise licensed to us. Subject to compliance with these Terms, we grant you a non-exclusive, non-transferable, non-sublicensable, revocable, and limited licence to use the Services in accordance with these Terms and our written instructions issued from time to time. Any rights not expressly granted herein are reserved by Homelyo or Homelyo's licensors.

(b) We may request you to submit suggestions and other feedback, including bug reports, relating to the Services from time to time ("Feedback"). We may freely use, copy, disclose, publish, display, distribute, and exploit the Feedback we receive from you without any payment of royalty, acknowledgement, prior consent, or any other form of restriction arising out of your intellectual property rights.

(c) Except as expressly stated in these Terms, nothing in these Terms should be construed as conferring any right in, or licence to, our or any third party's intellectual property rights.`,
  },
  {
    title: '14. Term and Termination',
    body: `(a) These Terms shall remain in effect unless terminated in accordance with the terms hereunder ("Period").

(b) We may restrict, deactivate, or terminate your access to, or use of, the Services, or any portion thereof, immediately, and at any point at our sole discretion, (i) if you violate or breach any of the obligations, responsibilities, or covenants under these Terms, (ii) when you cease to become a user of our Services, (iii) you do not, or are likely not to qualify under applicable law, or the standards and policies of Homelyo or its affiliates, to access and use the Services, (iv) violate or breach the Privacy Policy, or (v) for any legitimate business, legal, or regulatory reason.

(c) You may terminate these Terms, at any time, for any reason, by informing Homelyo in writing at support@homelyoapp.com.

(d) Upon termination of these Terms:
(i) the Account will expire, and you will not be granted access to your Account, or any files or other data contained in your Account;
(ii) the Services will "time-out";
(iii) your right to participate in the Platform, including but not limited to, your right to offer Pro Services, and your right to receive any fees or compensation, including, without limitation, referral discounts, incentive bonuses, or other special offer rewards, shall automatically terminate. Homelyo will pay to you within a reasonable period, all amounts owed to you including any security deposit you may have furnished at the time of onboarding, amounts paid towards unutilised Credits, and other monies Homelyo has collected from the Customer on your behalf, subject to the deduction of any amounts that you owe to Homelyo;
(iv) all rights or licences granted to you under these Terms will immediately terminate;
(v) you will immediately destroy, or, at the request of Homelyo, return, all Homelyo data, trademarks, service marks, or content, in your possession or control; and
(vi) these Terms shall terminate, except for those clauses that are expressly, or by implication, intended to survive termination or expiry.`,
  },
  {
    title: '15. Disclaimers and Warranties',
    body: `(a) The Services are provided on an "as is" basis without warranty of any kind, express, implied, statutory, or otherwise, including without limitation the implied warranties of title, non-infringement, merchantability, or fitness for a particular purpose. Without limiting the foregoing, we make no warranty that the Services will meet your requirements or expectations.

(b) No advice or information, whether oral or written, obtained by you from us shall create any warranty that is not expressly stated in the Terms.

(c) You agree and acknowledge that we are merely a Platform that connects you with Customers, and we shall not be liable in any manner for any obligations that have not been explicitly stated in these Terms. We are not liable or responsible for fulfilment of any bookings, for the performance of the Pro Services by you, or for your acts or omissions, during the provision of the Pro Services, including any damage you may cause to property. All contractual or commercial terms in connection with the Pro Services are between you and Customers.

(d) You agree that the relationship between Homelyo and you is voluntary, non-exclusive, on a principal-to-principal basis, and the parties are free to enter into any other arrangements or agreements with any third party. Homelyo does not provide, and you shall not seek from Homelyo, any supervision, directions, or control over the Pro Services.

(e) You represent that you have obtained any and all necessary licences, permits, authorisations, and tax registrations required under applicable laws or in line with industry standards to offer and provide the Pro Services.

(f) You agree that your continued use of the Services is subject to you maintaining a minimum threshold of ratings based on Customers' reviews. In the event your ratings fall below the minimum threshold, your access and use to the Platform shall be temporarily blocked, and you may be required to attend a training session to reactivate your access to the Services.

(g) You undertake that you will not, intentionally or unintentionally, make or give any negative or defamatory statements or declarations about Homelyo, its brand name, domain name, or otherwise engage in any act or omission that shall negatively affect the reputation or brand of Homelyo.

(h) To the fullest extent permissible by law, we, our affiliates, and our related parties each disclaim all liability for any loss or damage arising out of or due to:
(i) your use of, inability to use, or availability or unavailability of the Services, including the availability or non-availability of Leads;
(ii) the occurrence or existence of any defect, interruption, or delays, in the operation or transmission of information to, from, or through the Services;
(iii) the failure of the Services to remain operational for any period of time; and
(iv) the loss of any User Content and any other data in connection with your use of the Services.

(i) In no event shall either Party be liable to the other for any direct, special, indirect, incidental, consequential, punitive, reliance, or exemplary damages, including but not limited to, lost business opportunities, lost revenues, or loss of anticipated profits, arising out of, or relating to (A) these Terms; (B) the Services or the Pro Services; (C) your use or inability to use the Services.

(j) To the maximum extent permitted by law, our liability shall be limited to the amount of commission we receive in respect of a particular booking made on the Platform. In no event shall our total liability to you in connection with these Terms exceed INR 5,00,000 (Rupees Five Lakhs).`,
  },
  {
    title: '16. Indemnity',
    body: `(a) You shall indemnify, defend at our option, and hold us, our parent companies, subsidiaries, affiliates, and our officers, employees, directors, agents, and representatives, harmless from and against, any claim, demand, lawsuits, judicial proceeding, losses, liabilities, damages, and costs (including, without limitation, all damages, liabilities, settlements, and attorneys' fees), due to, or arising out of, your access and use to the Services, your provision of the Pro Services, violation of these Terms, or any violation of these Terms by any third party who may use your Account.

(b) In the event Homelyo is of the opinion that you have (i) performed the Pro Services in a deficient manner, or (ii) harmed or caused damage to a Customer or their property, Homelyo may, at its sole discretion, without admitting any liability, compensate such Customer for the deficient service or damage or harm caused. Homelyo may collect from you, partially or fully, the amount paid to the Customer in compensation.

(c) We shall indemnify, defend and hold you harmless from and against any claim, demand, lawsuits, judicial proceeding, loss, liability, damage and costs (including, without limitation, all damages, liabilities, settlements, and attorneys' fees), due to, or arising out of, Homelyo's gross negligence, fraud, or wilful misconduct.`,
  },
  {
    title: '17. Governing Law and Dispute Resolution',
    body: `(a) If you wish to raise a dispute, claim, or conflict which arises out of, or in connection with these Terms or the Services, you may make a complaint, or raise a dispute, through:
(i) Contacting a Homelyo representative;
(ii) Through the Service Professional helpline;
(iii) Through the complaints process operated by Homelyo; or
(iv) Through the grievance redressal procedure as provided in clause 18.

(b) In the event your dispute or complaint remains unresolved, the parties shall first attempt to settle their dispute through mediation, in good faith.

(c) These Terms shall be governed by, and construed and enforced in accordance with, the laws of India. Subject to other provisions in this clause, courts in Bengaluru, Karnataka shall have exclusive jurisdiction over all issues arising out of these Terms or the use of the Services.

(d) In the event the parties are unable to resolve the dispute through mediation within a period of 45 (Forty-Five) days from the date of reference of the dispute to mediation, any controversies, conflicts, disputes, or differences arising out of these Terms shall be resolved by arbitration in Bengaluru in accordance with the Arbitration and Conciliation Act, 1996, for the time being in force, which is deemed to be incorporated by reference in this clause. The tribunal shall consist of 1 (One) arbitrator mutually appointed by you and Homelyo. The language of the arbitration shall be English. The decision of the arbitrator shall be final and binding on all the parties thereto. Each party to the arbitration shall bear its own costs with respect to any dispute.`,
  },
  {
    title: '18. Grievance Redressal',
    body: `(a) You may contact our designated Grievance Redressal Officer with any complaints or queries relating to the Services, or these Terms, through registered post or through email, details of which are provided below:

Name: Grievance Officer, Homelyo
Email Address: grievance@homelyoapp.com
Website: homelyoapp.com

(b) We shall ensure that your complaint is resolved within timelines prescribed by applicable laws.

(c) Subject to the Terms, it is hereby clarified that Homelyo will not penalise you in any form or manner if you are found to have membership in a trade union or engaging/participating in any form of collective action, bargaining, etc.`,
  },
  {
    title: '19. Miscellaneous Provisions',
    body: `(a) Changes to Terms: The Terms are subject to revisions at any time, as determined by us, and all changes are effective upon the expiry of 7 days of being posted on the Platform. You agree and acknowledge that 7 (seven) days is an adequate and sufficient time period for you to review the revised Terms and communicate to Homelyo any disagreements you may have. It is your responsibility to review these Terms periodically for any updates or changes. You will be deemed to have accepted the changes made to these Terms if you continue to use the Platform following the expiry of 7 (seven) days.

(b) Modification/Discontinuation of Services: We reserve the right at any time to add, modify, or discontinue any of the Services whether temporarily or permanently, in whole or in part, for any reason whatsoever, by providing you a prior notice of at least 30 (thirty) days via our platform.

(c) Severability: If any provision of these Terms is determined by any court or other competent authority to be unlawful or unenforceable, the other provisions of these Terms will continue to be in effect. If any unlawful or unenforceable provision would be lawful or enforceable if a part of it were deleted, that part will be deemed to be deleted, and the rest of the provision will continue in effect.

(d) Assignment: You shall not license, sell, transfer, or assign your rights, obligations, or covenants under these Terms, or your Account, in any manner, without our prior written consent. We may assign our rights to any of our affiliates, subsidiaries, or parent companies, any successor in interest of any business associated with the Services, or any third party, without any prior notice to you.

(e) Notices: All notices, requests, demands, and determinations for us under these Terms (other than routine operational communications) shall be sent to legal@homelyoapp.com.

(f) Third-Party Rights: No third party shall have any rights to enforce any terms contained herein.

(g) Force Majeure: We shall have no liability to you if we are prevented from, or delayed in performing our obligations, or from carrying on our business, by acts, events, omissions, or accidents beyond our reasonable control, including without limitation, strikes, failure of a utility service or telecommunications network, act of God, war, riot, civil commotion, malicious damage, pandemic, epidemic, or compliance with any law or governmental order, rule, regulation, or direction.

(h) Relationship between Parties: Nothing in these Terms is intended to, or shall be deemed to create a relationship of partnership, agency, joint venture, joint enterprise, or fiduciary relationship between the parties, and neither party shall have the authority to contract for, or enter into commitments, for, or on behalf of the other party.`,
  },
];

export const TermsOfServiceScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms &amp; Conditions</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: June 2025</Text>
        <View style={styles.introBanner}>
          <Text style={styles.introText}>
            These Terms and Conditions govern your use of services made available on or through
            homelyoapp.com and/or the Homelyo Partner mobile app. By using the Services, you agree
            that you have read, understood, and are bound by these Terms.
          </Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  scroll: { flex: 1 },
  content: { padding: Spacing.xl, paddingBottom: 80 },
  lastUpdated: { fontSize: 12, color: Colors.textTertiary, marginBottom: Spacing.md },
  introBanner: {
    padding: Spacing.lg,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginBottom: Spacing.xl,
  },
  introText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  sectionBody: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
});
